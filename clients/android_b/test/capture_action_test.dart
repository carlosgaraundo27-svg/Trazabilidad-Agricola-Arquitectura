import 'package:flutter_test/flutter_test.dart';
import 'package:trazabilidad_android_b/capture_store.dart';

void main() {
  test('cada pausa muestra una acción sin cambiar identidad ni borrar', () {
    QueueItem row(String state, String? code) => QueueItem({
      'client_capture_id': 'fixture',
      'payload_v1': '{}',
      'state': state,
      'last_code': code,
    });
    expect(row('needs_login', '401').action, contains('mismo usuario'));
    expect(row('intervention', '403').action, contains('permiso'));
    expect(row('intervention', '404').action, contains('asignación'));
    expect(row('intervention', '409').action, contains('No cambies'));
    expect(
      row('intervention', 'RETRY_EXHAUSTED').action,
      contains('Sincronizar'),
    );
    expect(row('accepted', null).action, isNull);
  });
}
