import 'package:flutter_test/flutter_test.dart';
import 'package:trazabilidad_android_b/capture_contract.dart';
import 'package:trazabilidad_android_b/session.dart';

void main() {
  Map<String, dynamic> valid() => {
    'schemaVersion': 1,
    'parcelId': '40000000-0000-4000-8000-000000000001',
    'harvestedAt': '2026-01-02T07:00:00-05:00',
    'quantity': '37.125',
    'unit': 'kg',
  };
  test('v1 canonical matches server precision/time and stable field order', () {
    expect(
      PayloadV1.parse(valid()).canonical,
      '{"schemaVersion":1,"parcelId":"40000000-0000-4000-8000-000000000001","harvestedAt":"2026-01-02T12:00:00.000Z","quantity":"37.125","unit":"kg"}',
    );
    expect(
      PayloadV1.parse({...valid(), 'quantity': '999999999.999'})
          .body['quantity'],
      '999999999.999',
    );
    expect(
      PayloadV1.parse({...valid(), 'quantity': '1'}).body['quantity'],
      '1.000',
    );
  });
  test(
    'v1 rejects invalid IDs, dates, decimal floats/overflow, extras and zero',
    () {
      for (final invalid in [
        {...valid(), 'parcelId': 'not-a-uuid'},
        {...valid(), 'harvestedAt': '2026-02-30T00:00:00Z'},
        {...valid(), 'harvestedAt': '2999-01-01T00:00:00Z'},
        {...valid(), 'harvestedAt': '2026-01-01T00:00Z'},
        {...valid(), 'quantity': 37.125},
        {...valid(), 'quantity': '1000000000'},
        {...valid(), 'quantity': '0.000'},
        {...valid(), 'quantity': '1.0001'},
        {...valid(), 'quantity': '01'},
        {...valid(), 'unit': 'g'},
        {...valid(), 'actorId': 'forged'},
      ]) {
        expect(() => PayloadV1.parse(invalid), throwsA(isA<SessionFailure>()));
      }
    },
  );
  test('receipt exact immutable representation includes original payload', () {
    final body = {
      'clientCaptureId': '50000000-0000-4000-8000-000000000001',
      'preLotId': '60000000-0000-4000-8000-000000000001',
      'harvestId': '70000000-0000-4000-8000-000000000001',
      'status': 'registrado',
      'acceptedAt': '2026-01-03T00:00:00Z',
      'payload': valid(),
    };
    final receipt = CaptureReceipt.parse(body);
    expect(receipt.payload.canonical, PayloadV1.parse(valid()).canonical);
    expect(
      () => CaptureReceipt.parse({...body, 'status': 'changed'}),
      throwsA(isA<SessionFailure>()),
    );
    expect(
      () => CaptureReceipt.parse({...body, 'cookie': 'forbidden'}),
      throwsA(isA<SessionFailure>()),
    );
  });
}
