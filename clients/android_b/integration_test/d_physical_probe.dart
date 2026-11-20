import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';
import 'package:trazabilidad_android_b/main.dart' show configuredSession;
import 'package:trazabilidad_android_b/capture_controller.dart';
import 'package:trazabilidad_android_b/storage.dart';
import 'package:trazabilidad_android_b/transport.dart';

import 'd_physical_cases.dart';

// Test entry point, never the production main. No VM log discovery, no secret
// output and no change to logcat/security settings or business assertions.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!kDebugMode) throw StateError('Probe only for debug acceptance');
  const phase = String.fromEnvironment('D_PHASE'),
      runId = String.fromEnvironment('D_RUN_ID');
  requireD(runId.isNotEmpty, 'Unique evidence run required');
  runApp(
    const MaterialApp(
      home: Scaffold(body: Center(child: Text('Verificación D en Android…'))),
    ),
  );
  final configured = configuredSession();
  final c = CaptureController(
    configured.session,
    configured.workspace,
    configured.session.vault as KeystoreVault,
    configured.session.api as HttpsSessionApi,
  );
  Map<String, dynamic> report;
  try {
    report = {'status': 'approved', 'result': await runPhysicalCase(c, phase)};
  } catch (error) {
    report = {'status': 'failed', 'error': error.toString()};
  } finally {
    await c.pause();
    await c.workspace.lock();
    c.dispose();
    c.session.dispose();
  }
  await physicalWrite('probe-result', {
    'phase': phase,
    'runId': runId,
    ...report,
  });
  runApp(
    MaterialApp(
      home: Scaffold(body: Center(child: Text('D: ${report['status']}'))),
    ),
  );
}
