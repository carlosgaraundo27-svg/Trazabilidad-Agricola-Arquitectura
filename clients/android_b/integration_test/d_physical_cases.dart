// Shared criteria for the normal integration runner and a private standalone
// Android probe when an OEM encrypts logcat and VM discovery cannot attach.
import 'dart:convert';
import 'dart:io';

import 'package:sqflite/sqflite.dart';
import 'package:trazabilidad_android_b/capture_controller.dart';
import 'package:trazabilidad_android_b/capture_policy.dart';
import 'package:trazabilidad_android_b/session.dart';

void requireD(bool condition, String reason) {
  if (!condition) throw StateError(reason);
}

Future<File> physicalFile(String name) async =>
    File('${await getDatabasesPath()}/d-$name.json');
Future<Map<String, dynamic>> physicalRead(String name) async =>
    jsonDecode(await (await physicalFile(name)).readAsString())
        as Map<String, dynamic>;
Future<void> physicalWrite(String name, Map<String, dynamic> value) async {
  await (await physicalFile(name))
      .writeAsString(jsonEncode(value), flush: true);
}

Future<Map<String, dynamic>> physicalRemote(
  CaptureController c,
  String path,
) async {
  requireD(
    ['127.0.0.1', 'localhost'].contains(c.api.destination.origin.host),
    'Fixture must be loopback',
  );
  final client = HttpClient(context: c.api.context);
  try {
    final r = await client.getUrl(c.api.destination.origin.resolve(path));
    r.headers.set('X-Fixture-Key', const String.fromEnvironment('FIXTURE_KEY'));
    final res = await r.close();
    requireD(res.statusCode == 200, 'Fixture read must succeed');
    return jsonDecode(await utf8.decoder.bind(res).join())
        as Map<String, dynamic>;
  } finally {
    client.close(force: true);
  }
}

Future<void> blockedConfirmation(CaptureController c, String probe) async {
  try {
    await c.confirm(probe);
  } on SessionFailure catch (e) {
    requireD(
      e.kind == Failure.needsLogin,
      'Only needsLogin proves window blocked',
    );
    requireD(
      c.rows.singleWhere((r) => r.id == probe).state == 'draft',
      'Probe remains draft',
    );
    return;
  }
  throw StateError('Confirmation should have been blocked');
}

Future<Map<String, dynamic>> runPhysicalCase(
  CaptureController c,
  String phase,
) async {
  if (phase == 'verify-reboot-offline') {
    final old = await physicalRead('reboot');
    await c.boot();
    await c.pause();
    final stamp = await c.clock.now();
    requireD(
      stamp.boot != null && stamp.boot! > (old['clock']['boot'] as int),
      'Actual bootCount must increase',
    );
    requireD(
      c.session.state == SessionState.offline,
      'Offline profile must open',
    );
    final row = c.rows.singleWhere((r) => r.id == old['id']);
    requireD(
      row.state == 'pending' &&
          row.attempts == 0 &&
          row.payload == old['payload'],
      'Pending identity/content/attempts preserved',
    );
    requireD(
      !await c.canConfirm(),
      'Reboot without validation must block confirmation',
    );
    await blockedConfirmation(c, old['probeId'] as String);
    final result = {
      'id': row.id,
      'bootBefore': old['clock']['boot'],
      'bootAfter': stamp.boot,
      'pendingPreserved': true,
      'confirmationBlocked': true,
      'clock': stamp.toJson(),
    };
    await physicalWrite('reboot-offline-verified', result);
    return result;
  }
  if (phase == 'verify-reboot-online') {
    final old = await physicalRead('reboot');
    // Do not enable network before the successful offline verdict exists.
    final previous = await physicalRead('reboot-offline-verified');
    requireD(
      previous['pendingPreserved'] == true &&
          previous['confirmationBlocked'] == true,
      'Offline verification first',
    );
    await c.login(
      'campo-c@example.test',
      const String.fromEnvironment('TEST_PASSWORD'),
    );
    await c.pause();
    requireD(
      c.session.state == SessionState.online,
      'Online authentication required',
    );
    final row = c.rows.singleWhere((r) => r.id == old['id']);
    requireD(
      row.state == 'accepted' &&
          row.attempts == 1 &&
          row.payload == old['payload'],
      'One send, same pending body',
    );
    final receipt = await physicalRemote(c, '/__fixture/counts/${row.id}');
    requireD(
      (receipt['rows'] as List).length == 1 &&
          receipt['rows'][0]['audits'] == 1,
      'Single receipt and audit',
    );
    final totals = await physicalRemote(c, '/__fixture/totals');
    for (final key in ['harvests', 'prelots', 'receipts', 'audits']) {
      requireD(
        totals[key] == (old['totals'][key] as int) + 1,
        'Single independent $key',
      );
    }
    final window = c.profile!.window;
    final result = {
      'probeId': old['probeId'],
      'owner': c.session.owner!.key,
      'window': window.toJson(),
      'expiresAtUtc': window.serverTime
          .add(const Duration(hours: 24))
          .toIso8601String(),
      'clock': (await c.clock.now()).toJson(),
      'state': 'pending-real-time',
      'totals': totals,
    };
    await physicalWrite('24h', result);
    return result;
  }
  if (phase == 'verify-24h-offline') {
    final old = await physicalRead('24h');
    await c.boot();
    await c.pause();
    final now = await c.clock.now(),
        window = OfflineWindow.fromJson(old['window'] as Map<String, dynamic>);
    requireD(window.stamp.sameBoot(now), 'Reboot invalidates elapsed24h trial');
    requireD(
      now.elapsedMs - window.stamp.elapsedMs >=
          OfflineWindow.duration.inMilliseconds,
      'Real24h have not elapsed',
    );
    requireD(
      jsonEncode(c.profile!.window.toJson()) == jsonEncode(old['window']),
      'Do not revalidate/replace anchor',
    );
    requireD(!await c.canConfirm(), 'Expired window must block confirmation');
    await blockedConfirmation(c, old['probeId'] as String);
    final result = {
      'clock': now.toJson(),
      'confirmationBlocked': true,
      'sameAnchor': true,
    };
    await physicalWrite('24h-verified', result);
    return result;
  }
  throw ArgumentError('Unknown physical phase');
}
