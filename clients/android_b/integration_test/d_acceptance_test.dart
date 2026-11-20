import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:sqflite/sqflite.dart';
import 'package:trazabilidad_android_b/capture_workspace.dart';
import 'package:trazabilidad_android_b/capture_policy.dart';
import 'package:trazabilidad_android_b/session.dart';

import 'c_sync_test.dart' show makeC, capture, closeC, control;
import 'support.dart';

Future<File> marker(String name) async =>
    File('${await getDatabasesPath()}/d-$name.json');
Future<Map<String, dynamic>> readMarker(String name) async =>
    jsonDecode(await (await marker(name)).readAsString())
        as Map<String, dynamic>;
Future<void> writeMarker(String name, Map<String, dynamic> value) async =>
    (await marker(name))
        .writeAsString(jsonEncode(value), flush: true)
        .then((_) {});

void expectTotals(
  Map<String, dynamic> before,
  Map<String, dynamic> after,
  int increment,
) {
  for (final key in ['harvests', 'prelots', 'receipts', 'audits']) {
    expect(
      after[key],
      (before[key] as int) + increment,
      reason: 'Conteo independiente $key',
    );
  }
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const phase = String.fromEnvironment('D_PHASE');
  testWidgets('D aceptación Android: $phase', (tester) async {
    final c = makeC();
    if (phase == 'prepare-interruptions') {
      await c.login('campo-c@example.test', fixturePassword);
      await c.pause();
      c.foreground = true;
      final totals = await control('', totals: true);
      final first = await capture(c), second = await capture(c);
      final rows = c.rows
          .where((r) => [first, second].contains(r.id))
          .map((r) => {'id': r.id, 'payload': r.payload})
          .toList();
      expect(rows.length, 2);
      expect(
        rows.every(
          (r) => c.rows.singleWhere((x) => x.id == r['id']).attempts == 0,
        ),
        true,
      );
      await writeMarker('interruptions', {
        'first': first,
        'second': second,
        'rows': rows,
        'totals': totals,
        'owner': c.session.owner!.key,
        'clock': (await c.clock.now()).toJson(),
      });
    } else if (phase == 'verify-pending-offline') {
      final old = await readMarker('interruptions');
      await c.boot();
      await c.pause();
      expect(c.session.state, SessionState.offline);
      for (final saved in old['rows'] as List) {
        final r = c.rows.singleWhere((r) => r.id == saved['id']);
        expect(r.payload, saved['payload']);
        expect(r.state, 'pending');
        expect(r.attempts, 0);
      }
      expect(await c.canConfirm(), true);
      await writeMarker('pending-verified', {
        'phase': phase,
        'sameBoot': true,
        'clock': (await c.clock.now()).toJson(),
      });
    } else if (phase == 'verify-inflight-recovery') {
      final old = await readMarker('interruptions');
      await c.boot();
      await c.pause();
      for (final saved in old['rows'] as List) {
        final r = c.rows.singleWhere((r) => r.id == saved['id']);
        expect(r.payload, saved['payload']);
        expect(r.state, 'accepted');
        expect(r.attempts, r.id == old['second'] ? 2 : 1);
        final remote = await control('', id: r.id, counts: true);
        expect((remote['rows'] as List).length, 1);
        expect(remote['rows'][0]['audits'], 1);
      }
      final remote = await control(
        '',
        id: old['second'] as String,
        counts: true,
      );
      expect(remote['fault']['requests'].length, 2);
      expect(
        (remote['fault']['requests'] as List)
            .map((r) => r['hash'])
            .toSet()
            .length,
        1,
      );
      await control('release-response', id: old['second'] as String);
      expectTotals(
        old['totals'] as Map<String, dynamic>,
        await control('', totals: true),
        2,
      );
      await writeMarker('inflight-verified', {
        'phase': phase,
        'first': old['first'],
        'second': old['second'],
        'attempts': [1, 2],
        'acceptedOnce': true,
      });
    } else if (phase == 'retry-exhaust') {
      await c.login('campo-c@example.test', fixturePassword);
      final totals = await control('', totals: true);
      final id = await capture(c),
          payload = c.rows.singleWhere((r) => r.id == id).payload;
      await control('fail-six', id: id);
      await c.synchronize();
      for (
        var i = 0;
        i < 100 &&
            !c.rows.any((r) => r.id == id && r.code == 'RETRY_EXHAUSTED');
        i++
      ) {
        await Future<void>.delayed(const Duration(seconds: 1));
      }
      await c.pause();
      final row = c.rows.singleWhere((r) => r.id == id);
      expect(row.code, 'RETRY_EXHAUSTED');
      expect(row.attempts, 6);
      expect(row.cycleAttempts, 6);
      expect(row.payload, payload);
      expect(row.action, contains('Sincronizar'));
      final remote = await control('', id: id, counts: true);
      expect(remote['rows'], isEmpty);
      final requests = remote['fault']['requests'] as List;
      expect(requests.length, 6);
      expect(requests.map((r) => r['hash']).toSet().length, 1);
      final duration =
          (requests.last['monotonicMs'] as num) -
          (requests.first['monotonicMs'] as num);
      expect(duration, greaterThanOrEqualTo(60000));
      expectTotals(totals, await control('', totals: true), 0);
      await writeMarker('retries', {
        'id': id,
        'payload': payload,
        'attempts': 6,
        'realElapsedMs': duration,
        'requests': requests,
        'totals': totals,
      });
    } else if (phase == 'retry-manual') {
      final old = await readMarker('retries');
      await c.boot();
      final before = c.rows.singleWhere((r) => r.id == old['id']);
      expect(before.attempts, 6);
      expect(before.code, 'RETRY_EXHAUSTED');
      expect(before.payload, old['payload']);
      await c.synchronize(manual: true);
      await c.pause();
      final after = c.rows.singleWhere((r) => r.id == old['id']);
      expect(after.state, 'accepted');
      expect(after.attempts, 7);
      expect(after.payload, old['payload']);
      final remote = await control('', id: after.id, counts: true);
      expect((remote['rows'] as List).length, 1);
      expect(remote['rows'][0]['audits'], 1);
      expect(remote['fault']['requests'].length, 7);
      expect(
        (remote['fault']['requests'] as List)
            .map((r) => r['hash'])
            .toSet()
            .length,
        1,
      );
      await writeMarker('manual-verified', {
        'id': after.id,
        'attempts': 7,
        'sameContent': true,
        'acceptedOnce': true,
      });
      expectTotals(
        old['totals'] as Map<String, dynamic>,
        await control('', totals: true),
        1,
      );
    } else if (phase == 'actions') {
      await c.login('campo-c@example.test', fixturePassword);
      final id = await capture(c);
      await control('expire');
      await c.synchronize();
      expect(c.rows.singleWhere((r) => r.id == id).state, 'needs_login');
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(child: CaptureWorkspace(controller: c)),
          ),
        ),
      );
      expect(
        find.textContaining(
          'Cierra sesión e inicia online con el mismo usuario',
        ),
        findsWidgets,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      await c.login('campo-c@example.test', fixturePassword);
      final revoked = await capture(c);
      await control('revoke');
      await c.synchronize();
      expect(c.rows.singleWhere((r) => r.id == revoked).code, '403');
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(child: CaptureWorkspace(controller: c)),
          ),
        ),
      );
      expect(
        find.textContaining('Solicita restablecer el permiso'),
        findsWidgets,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      await control('restore');
      await c.synchronize(manual: true);
      await c.pause();
      expect(c.rows.singleWhere((r) => r.id == id).state, 'accepted');
      expect(c.rows.singleWhere((r) => r.id == revoked).state, 'accepted');
    } else if (phase == 'prepare-reboot') {
      await c.login('campo-c@example.test', fixturePassword);
      final totals = await control('', totals: true);
      await c.pause();
      c.foreground = true;
      final id = await capture(c), probe = newCaptureId();
      await c.save(probe, {
        'parcelId': 'c4000000-0000-4000-8000-000000000001',
        'harvestedAt': '2026-01-02T07:00:00-05:00',
        'quantity': '42.001',
        'unit': 'kg',
      });
      expect(await c.canConfirm(), true);
      await writeMarker('reboot', {
        'id': id,
        'payload': c.rows.singleWhere((r) => r.id == id).payload,
        'probeId': probe,
        'totals': totals,
        'clock': (await c.clock.now()).toJson(),
        'window': c.profile!.window.toJson(),
        'preparedAtUtc': DateTime.now().toUtc().toIso8601String(),
      });
    } else if (phase == 'verify-reboot-offline') {
      final old = await readMarker('reboot');
      await c.boot();
      await c.pause();
      final stamp = await c.clock.now();
      expect(stamp.boot, greaterThan(old['clock']['boot'] as int));
      expect(c.session.state, SessionState.offline);
      final row = c.rows.singleWhere((r) => r.id == old['id']);
      expect(row.state, 'pending');
      expect(row.attempts, 0);
      expect(row.payload, old['payload']);
      expect(await c.canConfirm(), false);
      await expectLater(
        c.confirm(old['probeId'] as String),
        throwsA(
          isA<SessionFailure>().having(
            (e) => e.kind,
            'kind',
            Failure.needsLogin,
          ),
        ),
      );
      expect(c.rows.singleWhere((r) => r.id == old['probeId']).state, 'draft');
      await writeMarker('reboot-offline-verified', {
        'id': row.id,
        'bootBefore': old['clock']['boot'],
        'bootAfter': stamp.boot,
        'pendingPreserved': true,
        'confirmationBlocked': true,
        'clock': stamp.toJson(),
      });
    } else if (phase == 'verify-reboot-online') {
      final old = await readMarker('reboot');
      await c.login('campo-c@example.test', fixturePassword);
      await c.pause();
      final row = c.rows.singleWhere((r) => r.id == old['id']);
      expect(row.state, 'accepted');
      expect(row.attempts, 1);
      expect(row.payload, old['payload']);
      final remote = await control('', id: row.id, counts: true);
      expect((remote['rows'] as List).length, 1);
      expect(remote['rows'][0]['audits'], 1);
      final window = c.profile!.window;
      expectTotals(
        old['totals'] as Map<String, dynamic>,
        await control('', totals: true),
        1,
      );
      await writeMarker('24h', {
        'probeId': old['probeId'],
        'owner': c.session.owner!.key,
        'window': window.toJson(),
        'expiresAtUtc': window.serverTime
            .add(const Duration(hours: 24))
            .toIso8601String(),
        'clock': (await c.clock.now()).toJson(),
        'state': 'pending-real-time',
      });
    } else if (phase == 'verify-24h-offline') {
      final old = await readMarker('24h');
      await c.boot();
      await c.pause();
      final now = await c.clock.now(),
          window = OfflineWindow.fromJson(
            old['window'] as Map<String, dynamic>,
          );
      expect(
        window.stamp.sameBoot(now),
        true,
        reason: 'Reinicio invalida el ensayo de transcurso24h',
      );
      expect(
        now.elapsedMs - window.stamp.elapsedMs,
        greaterThanOrEqualTo(OfflineWindow.duration.inMilliseconds),
      );
      expect(
        c.profile!.window.toJson(),
        old['window'],
        reason: 'No validar online durante el ensayo',
      );
      expect(await c.canConfirm(), false);
      await expectLater(
        c.confirm(old['probeId'] as String),
        throwsA(
          isA<SessionFailure>().having(
            (e) => e.kind,
            'kind',
            Failure.needsLogin,
          ),
        ),
      );
      expect(c.rows.singleWhere((r) => r.id == old['probeId']).state, 'draft');
      await writeMarker('24h-verified', {
        'clock': now.toJson(),
        'confirmationBlocked': true,
        'sameAnchor': true,
      });
    } else {
      fail('D_PHASE inválido');
    }
    await closeC(c);
  });
}
