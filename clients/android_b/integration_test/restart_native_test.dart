import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:trazabilidad_android_b/main.dart';
import 'package:trazabilidad_android_b/session.dart';

import 'support.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('NA/SB recuperacion tras force-stop de otro proceso Android', (
    tester,
  ) async {
    final parts = configuredSession();
    await parts.session.boot();
    expect(parts.session.state, SessionState.unverified);
    expect(parts.workspace.ownerKey, isNull);
    await parts.session.validate();
    expect(parts.session.state, SessionState.online);
    expect(await parts.workspace.pendingCount, greaterThan(0));
    final db = await fixtureDatabase(parts.session.owner!);
    final pending = await db.rawQuery(
      "SELECT payload_v1 FROM captures JOIN outbox USING(client_capture_id) WHERE outbox.state='pending'",
    );
    expect(
      pending.any((row) => (row['payload_v1'] as String).contains('37.125')),
      isTrue,
    );
    expect(await db.rawQuery('PRAGMA foreign_key_check'), isEmpty);
    await db.close();
    await parts.session.logout();
    expect(parts.session.remoteRevocation, isTrue);
  });
}
