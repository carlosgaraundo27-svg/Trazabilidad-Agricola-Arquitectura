import 'dart:convert';

import 'session.dart';

// Mirrors server/modules/harvest/sync-domain.js. No agronomic rule is added.
String captureId(Object? value) {
  final uuid = RegExp(
    r'^(?:[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[1-8][a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
  );
  if (value is! String || !uuid.hasMatch(value)) {
    throw const SessionFailure(Failure.protocol);
  }
  return value.toLowerCase();
}

String instant(Object? value, {bool rejectFuture = false}) {
  final pattern = RegExp(
    r'^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.(\d{1,3}))?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$',
  );
  final match = value is String ? pattern.firstMatch(value) : null;
  if (match == null) throw const SessionFailure(Failure.protocol);
  final year = int.parse(match[1]!),
      month = int.parse(match[2]!),
      day = int.parse(match[3]!);
  if (month < 1 ||
      month > 12 ||
      day < 1 ||
      day > DateTime.utc(year, month + 1, 0).day) {
    throw const SessionFailure(Failure.protocol);
  }
  final date = DateTime.parse(value as String).toUtc();
  if (rejectFuture && date.isAfter(DateTime.now().toUtc())) {
    throw const SessionFailure(Failure.protocol);
  }
  String two(int number) => number.toString().padLeft(2, '0');
  final y = date.year >= 0 && date.year <= 9999
      ? date.year.toString().padLeft(4, '0')
      : '${date.year < 0 ? '-' : '+'}${date.year.abs().toString().padLeft(6, '0')}';
  return '$y-${two(date.month)}-${two(date.day)}T${two(date.hour)}:${two(date.minute)}:${two(date.second)}.${date.millisecond.toString().padLeft(3, '0')}Z';
}

void exactKeys(Map<String, dynamic> value, Set<String> keys) {
  if (value.length != keys.length ||
      value.keys.any((key) => !keys.contains(key))) {
    throw const SessionFailure(Failure.protocol);
  }
}

class PayloadV1 {
  final Map<String, dynamic> body;
  PayloadV1._(Map<String, dynamic> value) : body = Map.unmodifiable(value);
  String get canonical => jsonEncode(body);
  factory PayloadV1.parse(
    Map<String, dynamic> value, {
    bool rejectFuture = true,
  }) {
    exactKeys(value, {
      'schemaVersion',
      'parcelId',
      'harvestedAt',
      'quantity',
      'unit',
    });
    final quantity = value['quantity'];
    if (value['schemaVersion'] != 1 ||
        quantity is! String ||
        !RegExp(r'^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$').hasMatch(quantity) ||
        !RegExp('[1-9]').hasMatch(quantity) ||
        !['kg', 'unidad'].contains(value['unit'])) {
      throw const SessionFailure(Failure.protocol);
    }
    final parts = quantity.split('.');
    return PayloadV1._({
      'schemaVersion': 1,
      'parcelId': captureId(value['parcelId']),
      'harvestedAt': instant(value['harvestedAt'], rejectFuture: rejectFuture),
      'quantity':
          '${parts[0]}.${(parts.length == 1 ? '' : parts[1]).padRight(3, '0')}',
      'unit': value['unit'],
    });
  }
}

class CaptureReceipt {
  final String id, preLotId, harvestId, acceptedAt;
  final PayloadV1 payload;
  CaptureReceipt._(
    this.id,
    this.preLotId,
    this.harvestId,
    this.acceptedAt,
    this.payload,
  );
  factory CaptureReceipt.parse(Map<String, dynamic> value) {
    exactKeys(value, {
      'clientCaptureId',
      'preLotId',
      'harvestId',
      'status',
      'acceptedAt',
      'payload',
    });
    if (value['status'] != 'registrado' ||
        value['payload'] is! Map<String, dynamic>) {
      throw const SessionFailure(Failure.protocol);
    }
    return CaptureReceipt._(
      captureId(value['clientCaptureId']),
      captureId(value['preLotId']),
      captureId(value['harvestId']),
      instant(value['acceptedAt']),
      PayloadV1.parse(
        value['payload'] as Map<String, dynamic>,
        rejectFuture: false,
      ),
    );
  }
  String get canonical => jsonEncode({
    'clientCaptureId': id,
    'preLotId': preLotId,
    'harvestId': harvestId,
    'status': 'registrado',
    'acceptedAt': acceptedAt,
    'payload': payload.body,
  });
}
