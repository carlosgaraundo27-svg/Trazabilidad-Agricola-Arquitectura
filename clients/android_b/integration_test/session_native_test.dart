import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:sqflite/sqflite.dart';
import 'package:trazabilidad_android_b/main.dart';
import 'package:trazabilidad_android_b/session.dart';
import 'package:trazabilidad_android_b/storage.dart';

import 'support.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('NA login UI, cookie cifrada, HTTPS y CSRF reales', (
    tester,
  ) async {
    final parts = configuredSession();
    final s = parts.session;
    await tester.pumpWidget(SessionApp(session: s));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('email')),
      'campo@example.test',
    );
    await tester.enterText(find.byKey(const Key('password')), fixturePassword);
    final passwordField = tester
        .widget<TextField>(find.byKey(const Key('password')))
        .controller!;
    await tester.tap(find.text('Iniciar sesion'));
    await eventually(tester, () => s.state == SessionState.online);
    expect(find.text('Sesion validada'), findsOneWidget);
    expect(passwordField.text, isEmpty);
    final stored = await KeystoreVault(fixtureOrigin).read();
    expect(stored != null && !stored.expired, isTrue);
    expect(
      await request('POST', '/api/v1/auth/logout', credential: stored),
      403,
    );
    expect(await request('GET', '/api/v1/auth/me', credential: stored), 200);
    await expectLater(
      request('GET', '/health', trusted: false),
      throwsA(isA<HandshakeException>()),
    );
    await s.logout();
    expect(s.remoteRevocation, isTrue);
    expect(await KeystoreVault(fixtureOrigin).read(), isNull);
    expect(await request('GET', '/api/v1/auth/me', credential: stored), 401);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets(
    'NA recuperacion online y expiracion del servidor sin TTL ficticio',
    (tester) async {
      final first = configuredSession();
      await first.session.login('campo@example.test', fixturePassword);
      expect(first.session.state, SessionState.online);
      final expiry = (await KeystoreVault(fixtureOrigin).read())!.expires;
      await first.workspace.lock();
      final restarted = configuredSession();
      await restarted.session.boot();
      expect(restarted.session.state, SessionState.unverified);
      expect(restarted.workspace.ownerKey, isNull);
      await restarted.session.validate();
      expect(restarted.session.state, SessionState.online);
      expect((await KeystoreVault(fixtureOrigin).read())!.expires, expiry);
      expect(await request('POST', '/__fixture/expire', control: true), 204);
      await restarted.session.validate();
      expect(restarted.session.state, SessionState.locked);
      expect(restarted.session.failure, Failure.needsLogin);
      expect(restarted.workspace.ownerKey, isNull);
      expect(await KeystoreVault(fixtureOrigin).read(), isNull);
    },
  );
  testWidgets('NA logout sin red borra credenciales y conserva SQLite', (
    tester,
  ) async {
    final parts = configuredSession();
    await parts.session.login('campo@example.test', fixturePassword);
    final owner = parts.session.owner!;
    await insertFixturePending(
      owner,
      'offline-${DateTime.now().microsecondsSinceEpoch}',
    );
    final before = await parts.workspace.pendingCount;
    // The isolated fixture closes this one TLS socket without processing logout.
    // Device network settings, TLS policy and historical demo stay unchanged.
    expect(
      await request('POST', '/__fixture/drop-next-logout', control: true),
      204,
    );
    await parts.session.logout();
    expect(parts.session.remoteRevocation, isFalse);
    expect(await KeystoreVault(fixtureOrigin).read(), isNull);
    expect(parts.workspace.ownerKey, isNull);
    final db = await fixtureDatabase(owner);
    expect(
      (await db.rawQuery(
        "SELECT count(*) AS n FROM outbox WHERE state<>'accepted'",
      )).single['n'],
      before,
    );
    await db.close();
  });
  testWidgets('NA respuesta tardia no reabre A tras cambiar a B', (
    tester,
  ) async {
    final parts = configuredSession();
    final s = parts.session;
    await s.login('campo@example.test', fixturePassword);
    expect(s.state, SessionState.online);
    final a = s.owner!;
    expect(
      await request('POST', '/__fixture/delay-next-me', control: true),
      204,
    );
    final late = s.validate();
    await tester.pump(const Duration(milliseconds: 250));
    await s.logout();
    await s.login('otro@example.test', fixturePassword);
    expect(s.state, SessionState.online);
    final b = s.owner!.key;
    await late;
    await tester.pump(const Duration(seconds: 2));
    expect(s.owner!.key, b);
    expect(parts.workspace.ownerKey, b);
    expect(b, isNot(a.key));
    await s.logout();
  });
  testWidgets('SB fallo real del archivo cifrado bloquea sin borrar SQLite', (
    tester,
  ) async {
    final parts = configuredSession();
    final s = parts.session;
    await s.login('campo@example.test', fixturePassword);
    expect(s.state, SessionState.online);
    final owner = s.owner!;
    final before = await parts.workspace.pendingCount;
    final encrypted = File(
      '${Directory(await getDatabasesPath()).parent.path}/no_backup/session-v1.bin',
    );
    expect(await encrypted.exists(), isTrue);
    await encrypted.writeAsBytes([1, 2, 3], flush: true);
    await s.boot();
    expect(s.state, SessionState.locked);
    expect(s.failure, Failure.storage);
    expect(parts.workspace.ownerKey, isNull);
    expect(await encrypted.readAsBytes(), [1, 2, 3]);
    final db = await fixtureDatabase(owner);
    expect(
      (await db.rawQuery(
        "SELECT count(*) AS n FROM outbox WHERE state <> 'accepted'",
      )).single['n'],
      before,
    );
    await db.close();
    // Explicit online authentication can replace an unreadable record; boot
    // itself must never silently reset it or open the owner's database.
    await s.login('campo@example.test', fixturePassword);
    expect(s.state, SessionState.online);
    await s.logout();
  });
  testWidgets('SB aislamiento A/B, durabilidad, FK y rollback SQLite nativos', (
    tester,
  ) async {
    final parts = configuredSession();
    final s = parts.session;
    await s.login('campo@example.test', fixturePassword);
    expect(s.state, SessionState.online);
    final a = s.owner!;
    await insertFixturePending(
      a,
      'isolation-${DateTime.now().microsecondsSinceEpoch}',
    );
    final aCount = await parts.workspace.pendingCount;
    final db = await fixtureDatabase(a);
    expect((await db.rawQuery('PRAGMA foreign_keys')).single.values.single, 1);
    expect((await db.rawQuery('PRAGMA synchronous')).single.values.single, 2);
    final id = 'rollback-${DateTime.now().microsecondsSinceEpoch}';
    await db.insert('captures', {
      'client_capture_id': id,
      'phase': 'draft',
      'payload_v1':
          '{"quantity":"999999999999.999","unit":"kg","fixture":true}',
    });
    await expectLater(
      db.transaction((tx) async {
        await tx.update(
          'captures',
          {'phase': 'confirmed'},
          where: 'client_capture_id=?',
          whereArgs: [id],
        );
        throw StateError('fault before outbox');
      }),
      throwsStateError,
    );
    expect(
      (await db.query(
        'captures',
        where: 'client_capture_id=?',
        whereArgs: [id],
      )).single['phase'],
      'draft',
    );
    expect(
      await db.query('outbox', where: 'client_capture_id=?', whereArgs: [id]),
      isEmpty,
    );
    await db.transaction((tx) async {
      await tx.update(
        'captures',
        {'phase': 'confirmed'},
        where: 'client_capture_id=?',
        whereArgs: [id],
      );
      await tx.insert('outbox', {'client_capture_id': id, 'state': 'pending'});
    });
    await expectLater(
      db.update(
        'captures',
        {'payload_v1': 'different'},
        where: 'client_capture_id=?',
        whereArgs: [id],
      ),
      throwsA(isA<DatabaseException>()),
    );
    final columns = await db.rawQuery(
      "SELECT name FROM pragma_table_info('workspace') UNION SELECT name FROM pragma_table_info('captures') UNION SELECT name FROM pragma_table_info('outbox') UNION SELECT name FROM pragma_table_info('receipts')",
    );
    expect(
      columns.any(
        (row) => RegExp(
          'password|cookie|csrf|secret',
          caseSensitive: false,
        ).hasMatch(row['name'] as String),
      ),
      isFalse,
    );
    expect(
      (await db.query(
        'captures',
        where: 'client_capture_id=?',
        whereArgs: [id],
      )).single['payload_v1'],
      '{"quantity":"999999999999.999","unit":"kg","fixture":true}',
    );
    await db.close();
    await s.logout();
    await s.login('otro@example.test', fixturePassword);
    expect(s.state, SessionState.online);
    expect(s.owner!.organizationId, isNot(a.organizationId));
    expect(parts.workspace.ownerKey, isNot(a.key));
    final b = await fixtureDatabase(s.owner!);
    expect(
      await b.query('captures', where: 'client_capture_id=?', whereArgs: [id]),
      isEmpty,
    );
    await b.close();
    await s.logout();
    await s.login('campo@example.test', fixturePassword);
    expect(await parts.workspace.pendingCount, aCount + 1);
    await parts.workspace.lock();
    // Keep A's vault and pending rows for the separate process-restart test.
  });
}
