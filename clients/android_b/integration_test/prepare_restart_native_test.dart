import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:trazabilidad_android_b/main.dart';
import 'package:trazabilidad_android_b/session.dart';

import 'support.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('Preparar sesion y pendiente para prueba entre procesos', (
    tester,
  ) async {
    final parts = configuredSession();
    await parts.session.login('campo@example.test', fixturePassword);
    expect(parts.session.state, SessionState.online);
    await insertFixturePending(
      parts.session.owner!,
      'restart-${DateTime.now().microsecondsSinceEpoch}',
    );
    expect(await parts.workspace.pendingCount, greaterThan(0));
    await parts.workspace.lock();
  });
}
