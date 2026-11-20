import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';

enum SessionState { locked, unverified, online }

enum Failure {
  invalidCredentials,
  needsLogin,
  permission,
  network,
  conflict,
  storage,
  staleGeneration,
  protocol,
}

class SessionFailure implements Exception {
  final Failure kind;
  const SessionFailure(this.kind);
  @override
  String toString() => 'SessionFailure: ${kind.name}';
}

class Owner {
  final String organizationId, actorId;
  const Owner(this.organizationId, this.actorId);
  String get key =>
      '${Uri.encodeComponent(organizationId)}_${Uri.encodeComponent(actorId)}';
}

class Identity {
  final Owner owner;
  final String csrf;
  const Identity(this.owner, this.csrf);
}

class Destination {
  final Uri origin;
  Destination(this.origin) {
    if (origin.scheme != 'https' ||
        origin.host.isEmpty ||
        origin.userInfo.isNotEmpty ||
        origin.hasQuery ||
        origin.hasFragment ||
        !['', '/'].contains(origin.path)) {
      throw ArgumentError(
        'Se requiere un origen HTTPS sin ruta ni credenciales.',
      );
    }
  }
  bool allow(Uri uri) =>
      uri.scheme == 'https' &&
      uri.host == origin.host &&
      uri.port == origin.port &&
      uri.userInfo.isEmpty &&
      !uri.hasQuery &&
      !uri.hasFragment &&
      (uri.path == '/api/v1' || uri.path.startsWith('/api/v1/')) &&
      !uri.pathSegments.any(
        (part) =>
            part == '.' ||
            part == '..' ||
            part.contains('/') ||
            part.contains('\\'),
      );
}

class Credential {
  final String value;
  final DateTime expires;
  final Uri origin;
  Credential(this.value, this.expires, this.origin);
  bool get expired => !expires.isAfter(DateTime.now().toUtc());
  factory Credential.fromCookie(Cookie cookie, Uri origin, DateTime now) {
    final age = cookie.maxAge;
    if (cookie.name != 'session' ||
        cookie.value.isEmpty ||
        !cookie.secure ||
        !cookie.httpOnly ||
        cookie.sameSite != SameSite.strict ||
        cookie.domain != null ||
        cookie.path != '/api/v1' ||
        age == null ||
        age <= 0 ||
        age > 28800) {
      throw const SessionFailure(Failure.protocol);
    }
    var expiry = now.add(Duration(seconds: age));
    if (cookie.expires != null && cookie.expires!.isBefore(expiry)) {
      expiry = cookie.expires!;
    }
    if (!expiry.isAfter(now)) throw const SessionFailure(Failure.needsLogin);
    return Credential(cookie.value, expiry, origin);
  }
  Map<String, String> toJson() => {
    'value': value,
    'expires': expires.toUtc().toIso8601String(),
    'origin': origin.origin,
  };
  factory Credential.fromJson(Map<String, dynamic> json, Uri expected) {
    if (json['origin'] != expected.origin ||
        json['value'] is! String ||
        (json['value'] as String).isEmpty) {
      throw const SessionFailure(Failure.storage);
    }
    final expiry = DateTime.parse(json['expires'] as String).toUtc();
    if (expiry.isAfter(DateTime.now().toUtc().add(const Duration(hours: 8)))) {
      throw const SessionFailure(Failure.storage);
    }
    return Credential(json['value'] as String, expiry, expected);
  }
}

abstract interface class Vault {
  Future<Credential?> read();
  Future<void> write(Credential credential);
  Future<void> clear();
}

abstract interface class SessionApi {
  Future<Credential> login(String email, String password);
  Future<Identity> me(Credential credential);
  Future<bool> logout(Credential credential, String csrf);
  void cancel();
}

abstract interface class Workspace {
  Future<void> open(Owner owner, bool Function() current);
  Future<void> lock();
}

/// Every transition invalidates earlier asynchronous work. Durable vault and
/// workspace operations are serialized, and a late reply cannot publish a lease.
class SessionController extends ChangeNotifier {
  final SessionApi api;
  final Vault vault;
  final Workspace workspace;
  SessionController(this.api, this.vault, this.workspace);
  SessionState state = SessionState.locked;
  Failure? failure;
  Owner? owner;
  bool? remoteRevocation;
  int generation = 0;
  Credential? _credential;
  String? _csrf;
  Future<void> _storage = Future.value();
  Timer? _expiry;
  Future<T> _exclusive<T>(Future<T> Function() action) {
    final next = _storage.then((_) => action());
    _storage = next.then<void>((_) {}, onError: (Object _) {});
    return next;
  }

  int _invalidate() {
    _expiry?.cancel();
    generation++;
    api.cancel();
    state = SessionState.locked;
    owner = null;
    failure = null;
    remoteRevocation = null;
    notifyListeners();
    return generation;
  }

  void _current(int lease) {
    if (lease != generation) {
      throw const SessionFailure(Failure.staleGeneration);
    }
  }

  Future<void> boot() async {
    final lease = _invalidate();
    _credential = null;
    _csrf = null;
    try {
      await _exclusive(() async {
        await workspace.lock();
        _current(lease);
        final stored = await vault.read();
        _current(lease);
        if (stored == null || stored.expired) {
          await vault.clear();
          return;
        }
        _credential = stored;
        state = SessionState.unverified;
      });
    } catch (_) {
      if (lease == generation) failure = Failure.storage;
    }
    if (lease == generation) notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final lease = _invalidate();
    _credential = null;
    _csrf = null;
    await _run(lease, () async {
      await _exclusive(() async {
        _current(lease);
        await workspace.lock();
        await vault.clear();
      });
      _current(lease);
      final credential = await api.login(email, password);
      _current(lease);
      await _activate(lease, credential, persist: true);
    });
  }

  Future<void> validate() async {
    final credential = _credential;
    final lease = _invalidate();
    _csrf = null;
    await _run(lease, () async {
      await _exclusive(() async {
        _current(lease);
        await workspace.lock();
      });
      _current(lease);
      if (credential == null || credential.expired) {
        throw const SessionFailure(Failure.needsLogin);
      }
      await _activate(lease, credential, persist: false);
    });
  }

  Future<void> _activate(
    int lease,
    Credential credential, {
    required bool persist,
  }) async {
    if (credential.expired) throw const SessionFailure(Failure.needsLogin);
    final identity = await api.me(credential);
    _current(lease);
    await _exclusive(() async {
      _current(lease);
      if (persist) await vault.write(credential);
      _current(lease);
      await workspace.open(identity.owner, () => lease == generation);
      _current(lease);
      _credential = credential;
      _csrf = identity.csrf;
      owner = identity.owner;
      state = SessionState.online;
      _expiry = Timer(
        credential.expires.difference(DateTime.now().toUtc()),
        () {
          if (lease == generation) unawaited(validate());
        },
      );
    });
  }

  Future<void> _run(int lease, Future<void> Function() action) async {
    try {
      await action();
    } catch (error) {
      if (lease != generation) return;
      failure = error is SessionFailure ? error.kind : Failure.storage;
      state = SessionState.locked;
      owner = null;
      _csrf = null;
      try {
        await _exclusive(() async {
          _current(lease);
          await workspace.lock();
          if (failure == Failure.needsLogin ||
              failure == Failure.invalidCredentials) {
            await vault.clear();
            _credential = null;
          }
        });
      } catch (_) {
        if (lease == generation) failure = Failure.storage;
      }
    }
    if (lease == generation) notifyListeners();
  }

  Future<void> logout() async {
    final credential = _credential;
    final csrf = _csrf;
    final lease = _invalidate();
    _credential = null;
    _csrf = null;
    // Clearing local authority always precedes the optional remote request.
    try {
      await _exclusive(() async {
        await workspace.lock();
        await vault.clear();
      });
    } catch (_) {
      if (lease == generation) {
        failure = Failure.storage;
        notifyListeners();
      }
      return;
    }
    bool confirmed = false;
    if (credential != null &&
        csrf != null &&
        !credential.expired &&
        lease == generation) {
      try {
        confirmed = await api.logout(credential, csrf);
      } catch (_) {
        confirmed = false;
      }
    }
    if (lease == generation) {
      remoteRevocation = confirmed;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    generation++;
    _expiry?.cancel();
    api.cancel();
    unawaited(workspace.lock());
    super.dispose();
  }
}
