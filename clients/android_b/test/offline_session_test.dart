import 'package:flutter_test/flutter_test.dart';
import 'package:trazabilidad_android_b/session.dart';

import 'session_test.dart'
    show MemoryVault, MemoryWorkspace, FakeApi, origin, cookie, userA;

class OfflineMemoryVault extends MemoryVault implements OfflineIdentityVault {
  Owner? active;
  bool blocked = false;
  @override
  Future<Owner?> activeOwner() async => active;
  @override
  Future<void> invalidateCredential({required bool remote}) async {
    value = null;
    if (remote) blocked = true;
  }

  @override
  Future<void> clear() async {
    await super.clear();
    active = null;
  }
}

void main() {
  test(
    'cookie expirada conserva lectura del perfil activo sin conceder envio',
    () async {
      final vault = OfflineMemoryVault()
        ..active = userA
        ..value = Credential('expired', DateTime.utc(2000), origin);
      final workspace = MemoryWorkspace();
      final s = SessionController(FakeApi(), vault, workspace);
      await s.boot();
      expect(s.state, SessionState.offline);
      expect(workspace.active!.key, userA.key);
      expect(vault.blocked, isFalse);
      await expectLater(
        s.authorized((credential, csrf) => Future.value(true)),
        throwsA(isA<SessionFailure>()),
      );
      await s.logout();
      expect(vault.active, isNull);
      await s.boot();
      expect(s.state, SessionState.locked);
      expect(workspace.active, isNull);
    },
  );
  test(
    '401 remoto conserva consulta pero bloquea confirmacion hasta revalidar',
    () async {
      final vault = OfflineMemoryVault()
        ..active = userA
        ..value = cookie;
      final api = FakeApi()..fail = true;
      final s = SessionController(api, vault, MemoryWorkspace());
      await s.boot();
      await s.validate();
      expect(s.state, SessionState.offline);
      expect(vault.blocked, isTrue);
      expect(vault.value, isNull);
    },
  );
  test('logout online no deja autoridad offline tras cerrar proceso', () async {
    final vault = OfflineMemoryVault();
    final s = SessionController(FakeApi(), vault, MemoryWorkspace());
    await s.login('a@example.test', 'transient');
    vault.active = userA;
    await s.logout();
    expect(vault.active, isNull);
    expect(vault.value, isNull);
    expect(s.remoteRevocation, isTrue);
  });
}
