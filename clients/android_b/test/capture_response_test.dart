import 'package:flutter_test/flutter_test.dart';
import 'package:trazabilidad_android_b/transport.dart';
import 'package:trazabilidad_android_b/session.dart';

void main() {
  test('ACK exige status/replay, ID y contenido congelado', () {
    const id = 'b0000000-0000-4000-8000-000000000001';
    final payload = {
      'schemaVersion': 1,
      'parcelId': id,
      'harvestedAt': '2026-01-01T00:00:00.000Z',
      'quantity': '1.000',
      'unit': 'kg',
    };
    final receipt = {
      'clientCaptureId': id,
      'preLotId': id,
      'harvestId': id,
      'status': 'registrado',
      'acceptedAt': '2026-01-01T00:00:00Z',
      'payload': payload,
      'replayed': false,
    };
    expect(parseCaptureResponse(201, receipt, id, payload).id, id);
    expect(
      parseCaptureResponse(200, {...receipt, 'replayed': true}, id, payload).id,
      id,
    );
    expect(
      () => parseCaptureResponse(200, receipt, id, payload),
      throwsA(isA<SessionFailure>()),
    );
    expect(
      () => parseCaptureResponse(201, receipt, id, {
        ...payload,
        'quantity': '2.000',
      }),
      throwsA(isA<SessionFailure>()),
    );
    expect(
      () =>
          parseCaptureResponse(201, {...receipt, 'extra': 'bad'}, id, payload),
      throwsA(isA<SessionFailure>()),
    );
  });
}
