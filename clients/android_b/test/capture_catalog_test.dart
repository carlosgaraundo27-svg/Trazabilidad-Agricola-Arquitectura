import 'package:flutter_test/flutter_test.dart';
import 'package:trazabilidad_android_b/capture_catalog.dart';
import 'package:trazabilidad_android_b/session.dart';

void main() {
  test(
    'catálogo estricto rechaza unidades representadas como texto y duplicados',
    () {
      const id = 'c1000000-0000-4000-8000-000000000001';
      final good = {
        'owner': {'organizationId': id, 'actorId': id},
        'parcels': [
          {'id': id, 'name': 'Ficticia'},
        ],
        'units': ['kg', 'unidad'],
        'quantity': {'wholeDigits': 9, 'decimalPlaces': 3},
        'version': List.filled(64, 'a').join(),
        'generatedAt': '2026-01-01T00:00:00Z',
      };
      expect(CatalogSnapshot.parse(good).parcels.length, 1);
      expect(
        () => CatalogSnapshot.parse({...good, 'units': '[kg, unidad]'}),
        throwsA(isA<SessionFailure>()),
      );
      expect(
        () => CatalogSnapshot.parse({
          ...good,
          'parcels': [
            {'id': id, 'name': 'A'},
            {'id': id, 'name': 'B'},
          ],
        }),
        throwsA(isA<SessionFailure>()),
      );
      expect(
        () => CatalogSnapshot.parse({...good, 'contact': 'privado'}),
        throwsA(isA<SessionFailure>()),
      );
    },
  );
}
