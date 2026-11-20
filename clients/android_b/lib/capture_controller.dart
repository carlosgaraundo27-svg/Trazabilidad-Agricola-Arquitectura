import 'dart:async';

import 'package:flutter/foundation.dart';

import 'capture_clock.dart';
import 'capture_policy.dart';
import 'capture_store.dart';
import 'session.dart';
import 'storage.dart';
import 'transport.dart';

class CaptureController extends ChangeNotifier {
  final SessionController session;
  final SqliteWorkspace workspace;
  final KeystoreVault vault;
  final HttpsSessionApi api;
  final CaptureClock clock;
  final RetryPolicy policy;
  CaptureController(
    this.session,
    this.workspace,
    this.vault,
    this.api, {
    CaptureClock? clock,
    RetryPolicy? policy,
  }) : clock = clock ?? AndroidCaptureClock(),
       policy = policy ?? RetryPolicy() {
    session.addListener(_sessionChanged);
  }
  List<QueueItem> rows = [];
  List<Map<String, Object?>> parcels = [];
  OfflineProfile? profile;
  String? notice;
  bool foreground = true, busy = false;
  Future<void>? _running;
  Timer? _timer;
  int _epoch = 0;
  bool _disposed = false;
  void _emit() {
    if (!_disposed) notifyListeners();
  }

  CaptureStore get store => CaptureStore(workspace, workspace.lease);
  bool _current(int epoch, int generation) =>
      !_disposed &&
      foreground &&
      epoch == _epoch &&
      session.generation == generation;
  void _sessionChanged() {
    if (session.owner == null) {
      rows = [];
      parcels = [];
      profile = null;
      _emit();
    }
  }

  Future<void> load() async {
    final owner = session.owner;
    if (owner == null) return;
    final gen = session.generation, s = store;
    final nextRows = await s.rows(),
        nextParcels = await s.parcels(),
        nextProfile = await vault.readProfile();
    if (_disposed ||
        session.generation != gen ||
        session.owner?.key != owner.key)
      return;
    rows = nextRows;
    parcels = nextParcels;
    profile = nextProfile?.owner.key == owner.key ? nextProfile : null;
    _emit();
  }

  Future<void> boot() async {
    await session.boot();
    await synchronize();
  }

  Future<void> synchronize({bool manual = false}) {
    final active = _running;
    if (active != null) return active;
    _timer?.cancel();
    final next = _work(manual);
    _running = next;
    return next.whenComplete(() {
      if (identical(_running, next)) _running = null;
    });
  }

  Future<void> _work(bool manual) async {
    if (!foreground) return;
    final epoch = _epoch;
    busy = true;
    notice = null;
    _emit();
    try {
      await session.validate();
      final gen = session.generation;
      if (!_current(epoch, gen) || session.owner == null) return;
      final s = store;
      await s.recover();
      await load();
      if (session.state != SessionState.online) {
        if (session.failure == Failure.needsLogin) await s.requireLogin();
        notice = 'Sin conexión validada: se conservan los registros locales.';
        return;
      }
      final catalog = await session.authorized(
        (credential, csrf) => api.catalog(credential),
      );
      if (!_current(epoch, gen)) return;
      if (catalog.owner.key != session.owner!.key) {
        throw const SessionFailure(Failure.protocol);
      }
      await s.replaceCatalog(catalog);
      final stamp = await clock.now();
      final downloaded = OfflineProfile(
        owner: catalog.owner,
        window: OfflineWindow(serverTime: catalog.generatedAt, stamp: stamp),
        catalogVersion: catalog.version,
      );
      await vault.grantProfile(
        downloaded,
        () =>
            _current(epoch, gen) &&
            session.state == SessionState.online &&
            session.owner?.key == downloaded.owner.key,
      );
      if (manual) await s.newCycle();
      while (_current(epoch, gen) && session.state == SessionState.online) {
        final item = await s.claim(await clock.now(), policy);
        if (item == null) break;
        await load();
        try {
          final receipt = await session.authorized(
            (credential, csrf) =>
                api.sendCapture(credential, csrf, item.id, item.payload),
          );
          if (!_current(epoch, gen)) break;
          await s.ack(receipt);
        } catch (error) {
          if (session.generation != gen) break;
          final failure = error is SessionFailure
              ? error
              : const SessionFailure(Failure.protocol);
          await s.failed(item, await clock.now(), policy, failure);
          if (failure.kind == Failure.needsLogin) {
            if (!failure.localExpiry) {
              await session.rejectRemoteSession();
            } else {
              await session.validate();
            }
            await load();
            break;
          }
          if (failure.kind == Failure.permission) {
            await vault.blockProfile(catalog.owner);
            if (failure.status == 404) {
              await s.disableParcel(item.fields['parcelId'] as String);
            }
            notice = 'El servidor rechazó el permiso o la asignación. El original se conserva.';
            break;
          }
        }
        await load();
      }
      if (_current(epoch, gen)) {
        final wait = await s.nextWait(await clock.now());
        if (wait != null) {
          _timer = Timer(
            wait < const Duration(milliseconds: 100)
                ? const Duration(milliseconds: 100)
                : wait,
            () {
              if (foreground) unawaited(synchronize());
            },
          );
        }
      }
    } catch (error) {
      if (error is SessionFailure &&
          error.kind == Failure.needsLogin &&
          !error.localExpiry) {
        await session.rejectRemoteSession();
      }
      if (error is SessionFailure &&
          error.kind == Failure.permission &&
          session.owner != null) {
        await vault.blockProfile(session.owner!);
        await store.requirePermission();
      }
      notice = error is SessionFailure
          ? 'No se completó la sincronización (${error.kind.name}). Los registros se conservan.'
          : 'No se pudo acceder al almacenamiento. No se han borrado registros.';
    } finally {
      try {
        await load();
      } catch (_) {
        notice =
            'No se pudo leer el almacenamiento; los registros se conservan.';
      }
      busy = false;
      _emit();
    }
  }

  Future<void> save(String id, Map<String, String> fields) async {
    await store.saveDraft(id, fields);
    await load();
  }

  Future<void> confirm(String id) async {
    final gen = session.generation,
        s = store,
        p = await vault.readProfile(),
        stamp = await clock.now();
    if (p == null ||
        session.owner?.key != p.owner.key ||
        gen != session.generation ||
        await s.catalogVersion() != p.catalogVersion) {
      throw const SessionFailure(Failure.needsLogin);
    }
    await s.confirm(id, p.window, stamp);
    await load();
  }

  Future<bool> canConfirm() async {
    final p = profile;
    return p != null &&
        p.owner.key == session.owner?.key &&
        p.window.canConfirm(await clock.now());
  }

  Future<void> pause() async {
    foreground = false;
    _epoch++;
    _timer?.cancel();
    api.cancel();
    await _running;
  }

  Future<void> resume() async {
    await _running;
    foreground = true;
    await synchronize();
  }

  Future<void> login(String email, String password) async {
    await pause();
    await session.login(email, password);
    foreground = true;
    await synchronize();
  }

  Future<void> logout() async {
    await pause();
    await session.logout();
    foreground = true;
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    _epoch++;
    foreground = false;
    api.cancel();
    session.removeListener(_sessionChanged);
    super.dispose();
  }
}
