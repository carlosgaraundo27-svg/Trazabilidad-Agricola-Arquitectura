import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:trazabilidad_android_b/main.dart';
import 'package:trazabilidad_android_b/session.dart';
import 'package:trazabilidad_android_b/storage.dart';
import 'package:trazabilidad_android_b/transport.dart';
import 'package:trazabilidad_android_b/capture_controller.dart';
import 'package:trazabilidad_android_b/capture_policy.dart';

import 'support.dart';

Future<Map<String, dynamic>> control(
  String action, {
  String? id,
  bool counts = false,
  bool totals = false,
}) async {
  final client = HttpClient(context: fixtureTrust());
  try {
    final r = await client.openUrl(
      counts || totals ? 'GET' : 'POST',
      fixtureOrigin.resolve(
        totals
            ? '/__fixture/totals'
            : counts
            ? '/__fixture/counts/$id'
            : '/__fixture/$action',
      ),
    );
    r.headers.set('X-Fixture-Key', const String.fromEnvironment('FIXTURE_KEY'));
    if (id != null && !counts) {
      r.headers.contentType = ContentType.json;
      r.write(jsonEncode({'id': id}));
    }
    final res = await r.close();
    expect(res.statusCode, counts || totals ? 200 : 204);
    final text = await utf8.decoder.bind(res).join();
    return text.isEmpty ? {} : jsonDecode(text) as Map<String, dynamic>;
  } finally {
    client.close(force: true);
  }
}

CaptureController makeC() {
  final parts = configuredSession();
  return CaptureController(
    parts.session,
    parts.workspace,
    parts.session.vault as KeystoreVault,
    parts.session.api as HttpsSessionApi,
    policy: RetryPolicy(jitter: () => 0),
  );
}

Future<String> capture(CaptureController c, {String? id}) async {
  final value = id ?? newCaptureId();
  await c.save(value, {
    'parcelId': 'c4000000-0000-4000-8000-000000000001',
    'harvestedAt': '2026-01-02T07:00:00-05:00',
    'quantity': '37.125',
    'unit': 'kg',
  });
  await c.confirm(value);
  return value;
}

Future<void> closeC(CaptureController c) async {
  await c.pause();
  await c.workspace.lock();
  c.dispose();
  c.session.dispose();
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'C HONOR: online único, respuesta perdida postcommit, conflicto, expiración, revocación y aislamiento',
    (tester) async {
      await control('restore');
      var c = makeC();
      await c.login('campo-c@example.test', fixturePassword);
      expect(c.session.state, SessionState.online);
      expect(c.parcels.length, 1);
      final first = await capture(c);
      await Future.wait([c.synchronize(), c.synchronize(), c.synchronize()]);
      expect(c.rows.singleWhere((r) => r.id == first).state, 'accepted');
      var remote = (await control('', id: first, counts: true))['rows'] as List;
      expect(remote.length, 1);
      expect(remote.single['audits'], 1);
      final lost = await capture(c);
      await control('drop', id: lost);
      await c.synchronize();
      await c.pause();
      final lossEvidence = await control('', id: lost, counts: true);
      expect(
        c.rows.singleWhere((r) => r.id == lost).state,
        'uncertain',
        reason: jsonEncode(lossEvidence),
      );
      expect(
        ((await control('', id: lost, counts: true))['rows'] as List).length,
        1,
      );
      final frozen = c.rows.singleWhere((r) => r.id == lost).payload;
      await closeC(c);
      c = makeC();
      await c.boot();
      await c.pause();
      await Future<void>.delayed(const Duration(seconds: 3));
      await c.resume();
      await c.pause();
      expect(c.rows.singleWhere((r) => r.id == lost).state, 'accepted');
      expect(c.rows.singleWhere((r) => r.id == lost).payload, frozen);
      remote = (await control('', id: lost, counts: true))['rows'] as List;
      expect(remote.length, 1);
      expect(remote.single['audits'], 1);
      c.foreground = true;
      final conflict = await capture(c);
      final raw = c.rows.singleWhere((r) => r.id == conflict).fields;
      await c.session.authorized(
        (cookie, csrf) => c.api.sendCapture(
          cookie,
          csrf,
          conflict,
          jsonEncode({...raw, 'quantity': '38.125'}),
        ),
      );
      await c.synchronize();
      await c.pause();
      expect(c.rows.singleWhere((r) => r.id == conflict).code, '409');
      expect(
        c.rows.singleWhere((r) => r.id == conflict).fields['quantity'],
        '37.125',
      );
      c.foreground = true;
      final expired = await capture(c);
      await control('expire');
      await c.synchronize();
      expect(c.session.state, SessionState.offline);
      expect(c.rows.singleWhere((r) => r.id == expired).state, 'needs_login');
      expect(await c.canConfirm(), false);
      await c.login('campo-c@example.test', fixturePassword);
      await c.synchronize(manual: true);
      await c.pause();
      expect(c.rows.singleWhere((r) => r.id == expired).state, 'accepted');
      c.foreground = true;
      final revoked = await capture(c);
      await control('revoke');
      await c.synchronize();
      expect(c.rows.singleWhere((r) => r.id == revoked).state, 'intervention');
      expect(await c.canConfirm(), false);
      await control('restore');
      await c.synchronize(manual: true);
      await c.pause();
      expect(c.rows.singleWhere((r) => r.id == revoked).state, 'accepted');
      c.foreground = true;
      final unassigned = await capture(c);
      await control('unassign');
      await c.synchronize();
      await c.pause();
      expect(c.rows.singleWhere((r) => r.id == unassigned).code, '404');
      expect(
        (await control('', id: unassigned, counts: true))['rows'],
        isEmpty,
      );
      await c.logout();
      await c.login('otro-c@example.test', fixturePassword);
      expect(c.rows, isEmpty);
      expect(c.parcels, isEmpty);
      expect(
        (await control('', id: unassigned, counts: true))['rows'],
        isEmpty,
      );
      await control('restore');
      await c.login('socio-c@example.test', fixturePassword);
      expect(
        c.session.owner!.organizationId,
        'c1000000-0000-4000-8000-000000000001',
      );
      expect(c.rows, isEmpty);
      expect(c.parcels.length, 1);
      expect(
        (await control('', id: unassigned, counts: true))['rows'],
        isEmpty,
      );
      await c.login('campo-c@example.test', fixturePassword);
      await c.synchronize(manual: true);
      await c.pause();
      expect(c.rows.singleWhere((r) => r.id == unassigned).state, 'accepted');
      expect(c.rows.singleWhere((r) => r.id == conflict).code, '409');
      await closeC(c);
    },
  );
}
