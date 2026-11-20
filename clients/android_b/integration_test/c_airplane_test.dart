import 'dart:convert';
import 'dart:io';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:sqflite/sqflite.dart';
import 'package:trazabilidad_android_b/capture_workspace.dart';
import 'package:trazabilidad_android_b/session.dart';

import 'c_sync_test.dart' show makeC, closeC, control;
import 'support.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const phase = String.fromEnvironment('AIRPLANE_PHASE');
  testWidgets('HONOR modo avión y reinicio de proceso: $phase', (tester) async {
    final c = makeC();
    final marker = File('${await getDatabasesPath()}/c-airplane-test.json');
    if (phase == 'prepare') {
      await control('restore');
      await c.login('campo-c@example.test', fixturePassword);
      expect(c.session.state, SessionState.online);
      expect(await c.canConfirm(), true);
      final stamp = await c.clock.now();
      expect(stamp.boot, isNotNull);
      expect(stamp.elapsedMs, greaterThan(0));
    } else if (phase == 'capture') {
      await c.boot();
      expect(c.session.state, SessionState.offline);
      expect(await c.canConfirm(), true);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(child: CaptureWorkspace(controller: c)),
          ),
        ),
      );
      await tester.tap(find.text('Nueva captura'));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(DropdownButtonFormField<String>).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Parcela ficticia C').last);
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextField).first,
        '2026-01-03T07:00:00-05:00',
      );
      await tester.enterText(find.byType(TextField).last, '57.123');
      await tester.ensureVisible(find.text('Guardar borrador'));
      await tester.tap(find.text('Guardar borrador'));
      await tester.pumpAndSettle();
      final draft = c.rows.firstWhere(
        (r) => r.state == 'draft' && r.fields['quantity'] == '57.123',
      );
      await tester.enterText(find.byType(TextField).last, '57.125');
      await tester.ensureVisible(find.text('Confirmar localmente'));
      await tester.tap(find.text('Confirmar localmente'));
      await tester.pumpAndSettle();
      final row = c.rows.singleWhere((r) => r.id == draft.id);
      expect(row.state, 'pending');
      expect(row.fields['quantity'], '57.125');
      expect(
        find.text('Contenido congelado; no se puede editar.'),
        findsOneWidget,
      );
      await marker.writeAsString(
        jsonEncode({'id': row.id, 'payload': row.payload}),
      );
      await tester.pumpWidget(const SizedBox.shrink());
    } else {
      final saved =
          jsonDecode(await marker.readAsString()) as Map<String, dynamic>;
      await c.boot();
      await c.pause();
      final row = c.rows.singleWhere((r) => r.id == saved['id']);
      expect(row.payload, saved['payload']);
      if (phase == 'reopen') {
        expect(c.session.state, SessionState.offline);
        expect(row.state, 'pending');
      } else if (phase == 'sync') {
        expect(c.session.state, SessionState.online);
        expect(row.state, 'accepted');
        final remote = await control('', id: row.id, counts: true);
        expect((remote['rows'] as List).length, 1);
        expect(remote['requests'], 1);
        expect(remote['rows'][0]['audits'], 1);
      } else {
        fail('AIRPLANE_PHASE inválido');
      }
    }
    await closeC(c);
  });
}
