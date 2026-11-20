import 'dart:convert';
import 'dart:io';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:sqflite/sqflite.dart';
import 'package:trazabilidad_android_b/main.dart';

import 'c_sync_test.dart' show makeC, capture, closeC, control;
import 'support.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const phase = String.fromEnvironment('LOST_PHASE');
  testWidgets('Respuesta perdida y proceso Android nuevo: $phase', (
    tester,
  ) async {
    final c = makeC(),
        marker = File('${await getDatabasesPath()}/c-lost-test.json');
    if (phase == 'drop') {
      await c.login('campo-c@example.test', fixturePassword);
      final id = await capture(c);
      await control('drop', id: id);
      await c.synchronize();
      await c.pause();
      final row = c.rows.singleWhere((r) => r.id == id);
      expect(row.state, 'uncertain');
      final remote = await control('', id: id, counts: true);
      expect(remote['dropped'], true);
      expect(remote['requests'], 1);
      expect((remote['rows'] as List).length, 1);
      await marker.writeAsString(
        jsonEncode({'id': id, 'payload': row.payload}),
      );
    } else if (phase == 'replay') {
      final old =
          jsonDecode(await marker.readAsString()) as Map<String, dynamic>;
      await c.boot();
      await c.pause();
      final row = c.rows.singleWhere((r) => r.id == old['id']);
      expect(row.state, 'accepted');
      expect(row.payload, old['payload']);
      expect(row.attempts, 2);
      final remote = await control('', id: row.id, counts: true);
      expect(remote['requests'], 2);
      expect((remote['rows'] as List).length, 1);
      expect(remote['rows'][0]['audits'], 1);
    } else {
      fail('LOST_PHASE inválido');
    }
    await closeC(c);
    if (phase == 'replay') {
      // Exercise production wiring, rather than an injected session-only B screen.
      await tester.pumpWidget(const SessionApp());
      await eventually(
        tester,
        () => find.text('Capturas de cosecha').evaluate().isNotEmpty,
      );
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump(const Duration(seconds: 1));
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await eventually(
        tester,
        () => find.text('Sesión validada online').evaluate().isNotEmpty,
      );
      expect(find.text('Sincronizar'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
    }
  });
}
