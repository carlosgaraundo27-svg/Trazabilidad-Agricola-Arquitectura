import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:sqflite/sqflite.dart';
import 'package:trazabilidad_android_b/session.dart';
import 'package:trazabilidad_android_b/storage.dart';
import 'package:trazabilidad_android_b/capture_store.dart';
import 'package:trazabilidad_android_b/capture_catalog.dart';
import 'package:trazabilidad_android_b/capture_policy.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'C migra SQLite B sin borrar; rollback confirmado y espera mayor durable',
    (tester) async {
      final owner = Owner(newCaptureId(), newCaptureId()),
          id = newCaptureId(),
          parcel = newCaptureId();
      final raw = {
        'parcelId': parcel,
        'harvestedAt': '2026-01-01T00:00:00Z',
        'quantity': '0',
        'unit': 'kg',
      };
      final legacy = await openDatabase(
        '${await getDatabasesPath()}/b_${owner.key}.sqlite',
        version: 1,
        singleInstance: false,
        onCreate: (db, version) async {
          for (final sql in SqliteWorkspace.schema) {
            await db.execute(sql);
          }
          await db.insert('workspace', {
            'id': 1,
            'organization_id': owner.organizationId,
            'actor_id': owner.actorId,
            'schema_version': 1,
          });
          await db.insert('captures', {
            'client_capture_id': id,
            'phase': 'draft',
            'payload_v1': jsonEncode(raw),
          });
        },
      );
      await legacy.close();
      final w = SqliteWorkspace();
      await w.open(owner, () => true);
      final s = CaptureStore(w, w.lease);
      expect((await s.rows()).single.fields['quantity'], '0');
      await w.transaction(w.lease, (tx) async {
        expect(
          Sqflite.firstIntValue(await tx.rawQuery('PRAGMA user_version')),
          2,
        );
      });
      await s.replaceCatalog(
        CatalogSnapshot.parse({
          'owner': {
            'organizationId': owner.organizationId,
            'actorId': owner.actorId,
          },
          'version': List.filled(64, 'b').join(),
          'generatedAt': '2026-01-02T00:00:00Z',
          'parcels': [
            {'id': parcel, 'name': 'Ficticia'},
          ],
          'units': ['kg', 'unidad'],
          'quantity': {'wholeDigits': 9, 'decimalPlaces': 3},
        }),
      );
      const stamp = ClockStamp(boot: 11, elapsedMs: 1000, process: 'p');
      final window = OfflineWindow(
        serverTime: DateTime.utc(2026, 1, 2),
        stamp: stamp,
      );
      await expectLater(
        s.confirm(id, window, stamp),
        throwsA(isA<SessionFailure>()),
      );
      expect((await s.rows()).single.state, 'draft');
      await s.saveDraft(id, {...raw, 'quantity': '999999999.999'});
      await w.transaction(
        w.lease,
        (tx) => tx.execute(
          "CREATE TRIGGER fixture_outbox_failure BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT,'fixture'); END",
        ),
      );
      await expectLater(
        s.confirm(id, window, stamp),
        throwsA(isA<DatabaseException>()),
      );
      expect((await s.rows()).single.state, 'draft');
      await w.transaction(w.lease, (tx) async {
        expect((await tx.query('outbox')), isEmpty);
        await tx.execute('DROP TRIGGER fixture_outbox_failure');
      });
      await s.confirm(id, window, stamp);
      final item = (await s.claim(stamp, RetryPolicy(jitter: () => 0)))!;
      await s.failed(
        item,
        stamp,
        RetryPolicy(jitter: () => 0),
        const SessionFailure(
          Failure.network,
          status: 429,
          retryAfter: Duration(hours: 25),
        ),
      );
      await w.lock();
      await w.open(owner, () => true);
      final reopened = CaptureStore(w, w.lease);
      await reopened.newCycle();
      expect(
        await reopened.claim(
          const ClockStamp(boot: 11, elapsedMs: 86401000, process: 'new'),
          RetryPolicy(jitter: () => 0),
        ),
        isNull,
      );
      expect((await reopened.rows()).single.attempts, 1);
      expect(
        (await reopened.claim(
          const ClockStamp(boot: 11, elapsedMs: 90001000, process: 'new'),
          RetryPolicy(jitter: () => 0),
        ))!.attempts,
        2,
      );
      await w.lock();
    },
  );
}
