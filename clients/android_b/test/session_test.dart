import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:trazabilidad_android_b/session.dart';

final origin = Uri.parse('https://example.test:3443');
final userA = Owner('org-a', 'actor-a');
final userB = Owner('org-b', 'actor-b');
final cookie = Credential(
  'opaque-session',
  DateTime.now().toUtc().add(const Duration(hours: 1)),
  origin,
);

class MemoryVault implements Vault {
  Credential? value;
  bool failRead = false;
  bool failClear = false;
  @override
  Future<Credential?> read() async {
    if (failRead) throw StateError('vault');
    return value;
  }

  @override
  Future<void> write(Credential credential) async {
    value = credential;
  }

  @override
  Future<void> clear() async {
    if (failClear) throw StateError('vault delete');
    value = null;
  }
}

class FakeApi implements SessionApi {
  Credential loginCredential = cookie;
  Owner owner = userA;
  bool fail = false;
  int logoutCount = 0;
  Completer<Identity>? delayed;
  @override
  Future<Credential> login(String email, String password) async =>
      loginCredential;
  @override
  Future<Identity> me(Credential credential) async {
    if (fail) throw const SessionFailure(Failure.needsLogin);
    return delayed == null ? Identity(owner, 'csrf') : delayed!.future;
  }

  @override
  Future<bool> logout(Credential credential, String csrf) async {
    logoutCount++;
    return !fail;
  }

  @override
  void cancel() {}
}

class MemoryWorkspace implements Workspace {
  Owner? active;
  final retained = <String>{};
  @override
  Future<void> open(Owner owner, bool Function() current) async {
    if (!current()) throw const SessionFailure(Failure.staleGeneration);
    active = owner;
    retained.add(owner.key);
  }

  @override
  Future<void> lock() async {
    active = null;
  }
}

void main() {
  test(
    'known local expiry invalidates an online lease automatically',
    () async {
      final api = FakeApi()
        ..loginCredential = Credential(
          'short',
          DateTime.now().toUtc().add(const Duration(milliseconds: 150)),
          origin,
        );
      final session = SessionController(api, MemoryVault(), MemoryWorkspace());
      addTearDown(session.dispose);
      final expired = Completer<void>();
      session.addListener(() {
        if (session.failure == Failure.needsLogin && !expired.isCompleted) {
          expired.complete();
        }
      });
      await session.login('a@example.test', 'transient');
      expect(session.state, SessionState.online);
      await expired.future.timeout(const Duration(seconds: 5));
      expect(session.state, SessionState.locked);
    },
  );
  test('failed durable clear never reports successful local logout', () async {
    final vault = MemoryVault();
    final session = SessionController(FakeApi(), vault, MemoryWorkspace());
    addTearDown(session.dispose);
    await session.login('a@example.test', 'transient');
    vault.failClear = true;
    await session.logout();
    expect(session.state, SessionState.locked);
    expect(session.failure, Failure.storage);
    expect(session.remoteRevocation, isNull);
  });
  test('HTTPS fixed origin, path boundary and no credentials/query', () {
    final policy = Destination(origin);
    expect(
      policy.allow(Uri.parse('https://example.test:3443/api/v1/auth/me')),
      isTrue,
    );
    for (final value in [
      'http://example.test:3443/api/v1/auth/me',
      'https://other.test:3443/api/v1/auth/me',
      'https://example.test/api/v1/auth/me',
      'https://example.test:3443/api/v1evil',
      'https://example.test:3443/q/id',
      'https://user@example.test:3443/api/v1',
      'https://example.test:3443/api/v1?x=1',
      'https://example.test:3443/api/v1/../public',
    ]) {
      expect(policy.allow(Uri.parse(value)), isFalse, reason: value);
    }
    expect(
      () => Destination(Uri.parse('http://example.test')),
      throwsArgumentError,
    );
  });
  test(
    'cookie requires Secure HttpOnly Strict host-only path and bounded expiry',
    () {
      Cookie valid() => Cookie('session', 'secret')
        ..secure = true
        ..httpOnly = true
        ..sameSite = SameSite.strict
        ..path = '/api/v1'
        ..maxAge = 28800;
      final now = DateTime.utc(2026, 11, 19);
      expect(
        Credential.fromCookie(valid(), origin, now).expires,
        now.add(const Duration(hours: 8)),
      );
      for (final invalid in [
        valid()..secure = false,
        valid()..httpOnly = false,
        valid()..domain = 'example.test',
        valid()..path = '/',
        valid()..maxAge = 28801,
        valid()..maxAge = 0,
        valid()..sameSite = SameSite.lax,
      ]) {
        expect(
          () => Credential.fromCookie(invalid, origin, now),
          throwsA(isA<SessionFailure>()),
        );
      }
    },
  );
  test('restart validates online; 401 and vault errors lock without deleting SQLite', () async {
    final vault = MemoryVault()..value = cookie;
    final api = FakeApi();
    final workspace = MemoryWorkspace();
    final session = SessionController(api, vault, workspace);
    await session.boot();
    expect(session.state, SessionState.unverified);
    expect(workspace.active, isNull);
    await session.validate();
    expect(session.state, SessionState.online);
    expect(workspace.active!.key, userA.key);
    api.fail = true;
    await session.validate();
    expect(session.state, SessionState.locked);
    expect(workspace.retained, contains(userA.key));
    vault.failRead = true;
    await session.boot();
    expect(session.failure, Failure.storage);
    expect(workspace.active, isNull);
  });
  test(
    'logout invalidates late me; account B cannot reopen account A',
    () async {
      final vault = MemoryVault();
      final api = FakeApi();
      final workspace = MemoryWorkspace();
      final session = SessionController(api, vault, workspace);
      await session.login('a@example.test', 'transient');
      final leaseA = session.generation;
      api.delayed = Completer<Identity>();
      final late = session.validate();
      await Future<void>.delayed(Duration.zero);
      await session.logout();
      expect(vault.value, isNull);
      expect(session.generation, greaterThan(leaseA));
      api.delayed!.complete(Identity(userA, 'late'));
      await late;
      expect(session.state, SessionState.locked);
      expect(workspace.active, isNull);
      api.delayed = null;
      api.owner = userB;
      await session.login('b@example.test', 'transient');
      expect(workspace.active!.key, userB.key);
      expect(workspace.retained, containsAll([userA.key, userB.key]));
      api.fail = true;
      await session.logout();
      expect(session.remoteRevocation, isFalse);
      expect(vault.value, isNull);
    },
  );
  test('expired credential never sends me or opens database', () async {
    final vault = MemoryVault()
      ..value = Credential('expired', DateTime.utc(2000), origin);
    final workspace = MemoryWorkspace();
    final session = SessionController(FakeApi(), vault, workspace);
    await session.boot();
    await session.validate();
    expect(session.state, SessionState.locked);
    expect(workspace.active, isNull);
    expect(vault.value, isNull);
  });
}
