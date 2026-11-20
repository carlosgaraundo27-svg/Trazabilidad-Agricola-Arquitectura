import 'capture_contract.dart';
import 'session.dart';

class CatalogSnapshot {
  final Owner owner;
  final String version;
  final DateTime generatedAt;
  final List<Map<String, String>> parcels;
  CatalogSnapshot._(this.owner, this.version, this.generatedAt, this.parcels);
  factory CatalogSnapshot.parse(Map<String, dynamic> value) {
    exactKeys(value, {
      'owner',
      'version',
      'generatedAt',
      'parcels',
      'units',
      'quantity',
    });
    final owner = value['owner'] as Map<String, dynamic>;
    exactKeys(owner, {'organizationId', 'actorId'});
    final quantity = value['quantity'] as Map<String, dynamic>;
    final units = value['units'];
    exactKeys(quantity, {'wholeDigits', 'decimalPlaces'});
    if (value['version'] is! String ||
        !RegExp(r'^[a-f0-9]{64}$').hasMatch(value['version'] as String) ||
        units is! List ||
        units.length != 2 ||
        units[0] != 'kg' ||
        units[1] != 'unidad' ||
        quantity['wholeDigits'] != 9 ||
        quantity['decimalPlaces'] != 3) {
      throw const SessionFailure(Failure.protocol);
    }
    final raw = value['parcels'] as List<dynamic>;
    if (raw.length > 1000) throw const SessionFailure(Failure.protocol);
    final seen = <String>{};
    final parcels = raw
        .map((entry) {
          final p = entry as Map<String, dynamic>;
          exactKeys(p, {'id', 'name'});
          final id = captureId(p['id']), name = p['name'];
          if (!seen.add(id) ||
              name is! String ||
              name.isEmpty ||
              name.length > 200) {
            throw const SessionFailure(Failure.protocol);
          }
          return Map<String, String>.unmodifiable({'id': id, 'name': name});
        })
        .toList(growable: false);
    return CatalogSnapshot._(
      Owner(captureId(owner['organizationId']), captureId(owner['actorId'])),
      value['version'] as String,
      DateTime.parse(instant(value['generatedAt'])),
      List.unmodifiable(parcels),
    );
  }
}
