import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:trazabilidad_android_b/main.dart';
import 'package:trazabilidad_android_b/session.dart';
import 'package:trazabilidad_android_b/storage.dart';

import 'support.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('NA/SB logout sigue cerrado despues de otro force-stop', (
    tester,
  ) async {
    final parts = configuredSession();
    await parts.session.boot();
    expect(parts.session.state, SessionState.locked);
    expect(parts.workspace.ownerKey, isNull);
    expect(await KeystoreVault(fixtureOrigin).read(), isNull);
    final db = await fixtureDatabase(
      const Owner(
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
      ),
    );
    expect(
      (await db.rawQuery('SELECT count(*) AS n FROM outbox')).single['n']
          as int,
      greaterThan(0),
    );
    expect(await db.rawQuery('PRAGMA foreign_key_check'), isEmpty);
    await db.close();
  });
}
