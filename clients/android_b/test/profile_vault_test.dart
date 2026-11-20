import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trazabilidad_android_b/credential_vault.dart';
import 'package:trazabilidad_android_b/capture_policy.dart';
import 'package:trazabilidad_android_b/session.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('org.trazabilidad/session-vault');
  final origin = Uri.parse('https://example.test');
  final owner = Owner(
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
  );
  final profile = OfflineProfile(
    owner: owner,
    window: OfflineWindow(
      serverTime: DateTime.utc(2026),
      stamp: const ClockStamp(boot: 1, elapsedMs: 10, process: 'one'),
    ),
    catalogVersion: 'v1',
  );
  String? stored;
  setUp(() {
    stored = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          switch (call.method) {
            case 'read':
              return stored;
            case 'write':
              stored = call.arguments as String;
              return null;
            case 'clear':
              stored = null;
              return null;
            default:
              throw StateError('method');
          }
        });
  });
  tearDown(
    () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null),
  );
  test(
    'migra credencial B, agrega perfil y distingue expiracion local/401',
    () async {
      stored = jsonEncode(
        Credential(
          'opaque',
          DateTime.now().toUtc().add(const Duration(hours: 1)),
          origin,
        ).toJson(),
      );
      final vault = KeystoreVault(origin);
      await vault.grantProfile(profile, () => true);
      expect((await vault.read())!.value, 'opaque');
      expect((await vault.activeOwner())!.key, owner.key);
      await vault.invalidateCredential(remote: false);
      expect(await vault.read(), isNull);
      expect((await vault.readProfile())!.window.blocked, isFalse);
      await vault.invalidateCredential(remote: true);
      expect((await vault.readProfile())!.window.blocked, isTrue);
      await vault.clear();
      expect(await vault.activeOwner(), isNull);
      expect(stored, isNull);
    },
  );
  test(
    'guardia obsoleta no reactiva perfil tras logout; corrupto no se reinicia',
    () async {
      final vault = KeystoreVault(origin);
      await vault.clear();
      await expectLater(
        vault.grantProfile(profile, () => false),
        throwsA(isA<SessionFailure>()),
      );
      expect(stored, isNull);
      stored = 'corrupt';
      await expectLater(vault.read(), throwsA(anything));
      expect(stored, 'corrupt');
    },
  );
  test('origen ajeno se rechaza sin borrar; operaciones concurrentes conservan perfil', () async {
    final vault = KeystoreVault(origin);
    await Future.wait([
      vault.write(
        Credential(
          'opaque',
          DateTime.now().toUtc().add(const Duration(hours: 1)),
          origin,
        ),
      ),
      vault.grantProfile(profile, () => true),
    ]);
    expect((await vault.read())!.value, 'opaque');
    expect((await vault.readProfile())!.owner.key, owner.key);
    await expectLater(
      KeystoreVault(Uri.parse('https://other.test')).read(),
      throwsA(anything),
    );
    expect(stored, isNotNull);
  });
}
