import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:sqflite/sqflite.dart';
import 'package:trazabilidad_android_b/main.dart';
import 'package:trazabilidad_android_b/capture_contract.dart';
import 'package:trazabilidad_android_b/session.dart';

import 'support.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'SB puertos reales: confirmacion ACK atomicos e identidad inmutable',
    (tester) async {
      final parts = configuredSession();
      final w = parts.workspace;
      final s = parts.session;
      await s.login('campo@example.test', fixturePassword);
      expect(s.state, SessionState.online);
      final lease = w.lease;
      final suffix = DateTime.now().microsecondsSinceEpoch
          .toRadixString(16)
          .padLeft(12, '0')
          .substring(2)
          .padLeft(12, '0');
      final id =
          '50000000-0000-4000-8000-${suffix.substring(suffix.length - 12)}';
      final payload = PayloadV1.parse({
        'schemaVersion': 1,
        'parcelId': '40000000-0000-4000-8000-000000000001',
        'harvestedAt': '2026-01-02T12:00:00Z',
        'quantity': '999999999.999',
        'unit': 'kg',
      });
      await w.saveDraft(lease, id, payload);
      final db = await fixtureDatabase(s.owner!);
      await db.execute(
        "CREATE TRIGGER btest_fail_confirm BEFORE INSERT ON outbox WHEN NEW.client_capture_id='$id' BEGIN SELECT RAISE(ABORT,'injected outbox failure'); END",
      );
      try {
        await expectLater(
          w.confirm(lease, id, payload),
          throwsA(isA<DatabaseException>()),
        );
      } finally {
        await db.execute('DROP TRIGGER btest_fail_confirm');
      }
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
      await w.confirm(lease, id, payload);
      await w.confirm(lease, id, payload);
      expect(
        (await db.query(
          'outbox',
          where: 'client_capture_id=?',
          whereArgs: [id],
        )).length,
        1,
      );
      await expectLater(
        w.saveDraft(lease, id, payload),
        throwsA(isA<SessionFailure>()),
      );
      final body = {
        'clientCaptureId': id,
        'preLotId': id.replaceFirst('50000000', '60000000'),
        'harvestId': id.replaceFirst('50000000', '70000000'),
        'status': 'registrado',
        'acceptedAt': '2026-01-03T00:00:00Z',
        'payload': payload.body,
      };
      final receipt = CaptureReceipt.parse(body);
      await db.execute(
        "CREATE TRIGGER btest_fail_ack BEFORE UPDATE OF state ON outbox WHEN NEW.client_capture_id='$id' AND NEW.state='accepted' BEGIN SELECT RAISE(ABORT,'injected ACK failure'); END",
      );
      try {
        await expectLater(
          w.recordAck(lease, receipt),
          throwsA(isA<DatabaseException>()),
        );
      } finally {
        await db.execute('DROP TRIGGER btest_fail_ack');
      }
      expect(
        await db.query(
          'receipts',
          where: 'client_capture_id=?',
          whereArgs: [id],
        ),
        isEmpty,
      );
      expect(
        (await db.query(
          'outbox',
          where: 'client_capture_id=?',
          whereArgs: [id],
        )).single['state'],
        'pending',
      );
      await w.recordAck(lease, receipt);
      await w.recordAck(lease, receipt);
      expect(
        (await db.query(
          'outbox',
          where: 'client_capture_id=?',
          whereArgs: [id],
        )).single['state'],
        'accepted',
      );
      expect(
        (await db.query(
          'receipts',
          where: 'client_capture_id=?',
          whereArgs: [id],
        )).single['result_json'],
        receipt.canonical,
      );
      await expectLater(
        w.recordAck(
          lease,
          CaptureReceipt.parse({
            ...body,
            'preLotId': id.replaceFirst('50000000', '80000000'),
          }),
        ),
        throwsA(isA<SessionFailure>()),
      );
      await expectLater(
        db.delete('receipts', where: 'client_capture_id=?', whereArgs: [id]),
        throwsA(isA<DatabaseException>()),
      );
      await db.close();
      await s.logout();
      await s.login('otro@example.test', fixturePassword);
      expect(s.state, SessionState.online);
      await expectLater(
        w.recordAck(lease, receipt),
        throwsA(
          predicate(
            (e) => e is SessionFailure && e.kind == Failure.staleGeneration,
          ),
        ),
      );
      await s.logout();
    },
  );
}
