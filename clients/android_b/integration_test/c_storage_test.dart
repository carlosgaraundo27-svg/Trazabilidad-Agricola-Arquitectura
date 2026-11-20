import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:trazabilidad_android_b/session.dart';
import 'package:trazabilidad_android_b/storage.dart';
import 'package:trazabilidad_android_b/capture_store.dart';
import 'package:trazabilidad_android_b/capture_catalog.dart';
import 'package:trazabilidad_android_b/capture_policy.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'SQLite C: draft estable, confirmacion atomica, claim unico y reintentos durables',
    (tester) async {
      final w = SqliteWorkspace(),
          owner = Owner(newCaptureId(), newCaptureId());
      await w.open(owner, () => true);
      var store = CaptureStore(w, w.lease);
      final parcel = newCaptureId(),
          stamp = ClockStamp(boot: 7, elapsedMs: 1000, process: 'test');
      await store.replaceCatalog(
        CatalogSnapshot.parse({
          'owner': {
            'organizationId': owner.organizationId,
            'actorId': owner.actorId,
          },
          'version': List.filled(64, 'a').join(),
          'generatedAt': '2026-01-02T12:00:00Z',
          'parcels': [
            {'id': parcel, 'name': 'Ficticia'},
          ],
          'units': ['kg', 'unidad'],
          'quantity': {'wholeDigits': 9, 'decimalPlaces': 3},
        }),
      );
      final id = newCaptureId(),
          raw = {
            'parcelId': parcel,
            'harvestedAt': '2026-01-01T07:00:00-05:00',
            'quantity': '',
            'unit': 'kg',
          };
      await store.saveDraft(id, raw);
      raw['quantity'] = '37.125';
      await store.saveDraft(id, raw);
      final window = OfflineWindow(
        serverTime: DateTime.utc(2026, 1, 2, 12),
        stamp: stamp,
      );
      await store.confirm(id, window, stamp);
      await expectLater(
        store.saveDraft(id, raw),
        throwsA(isA<SessionFailure>()),
      );
      final claims = await Future.wait([
        store.claim(stamp, RetryPolicy(jitter: () => 0)),
        store.claim(stamp, RetryPolicy(jitter: () => 0)),
      ]);
      expect(claims.whereType<QueueItem>().length, 1);
      final first = claims.whereType<QueueItem>().single;
      expect(first.attempts, 1);
      expect(jsonDecode(first.payload)['quantity'], '37.125');
      await w.lock();
      await w.open(owner, () => true);
      store = CaptureStore(w, w.lease);
      await store.recover();
      expect((await store.rows()).single.state, 'uncertain');
      expect(await store.claim(stamp, RetryPolicy(jitter: () => 0)), isNull);
      var now = ClockStamp(boot: 7, elapsedMs: 3000, process: 'new-process');
      final retry = await store.claim(now, RetryPolicy(jitter: () => 0));
      expect(retry!.id, id);
      expect(retry.payload, first.payload);
      await store.failed(
        retry,
        now,
        RetryPolicy(jitter: () => 0),
        const SessionFailure(Failure.network),
      );
      for (var attempt = 3; attempt <= 6; attempt++) {
        now = ClockStamp(
          boot: 7,
          elapsedMs: now.elapsedMs + 60000,
          process: 'p',
        );
        final item = await store.claim(now, RetryPolicy(jitter: () => 0));
        expect(item!.attempts, attempt);
        await store.failed(
          item,
          now,
          RetryPolicy(jitter: () => 0),
          const SessionFailure(Failure.network),
        );
      }
      expect((await store.rows()).single.state, 'intervention');
      await store.newCycle();
      final next = await store.claim(now, RetryPolicy(jitter: () => 0));
      expect(next!.attempts, 7);
      expect(next.payload, first.payload);
      await w.lock();
    },
  );
}
