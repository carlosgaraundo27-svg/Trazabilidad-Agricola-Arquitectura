import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite/sqflite.dart';
import 'package:trazabilidad_android_b/session.dart';

final fixtureOrigin = Uri.parse(const String.fromEnvironment('API_ORIGIN'));
SecurityContext fixtureTrust() => SecurityContext(withTrustedRoots: true)
  ..setTrustedCertificatesBytes(
    base64Decode(const String.fromEnvironment('DEBUG_CA_BASE64')),
  );
const fixturePassword = String.fromEnvironment('TEST_PASSWORD');
Future<int> request(
  String method,
  String path, {
  Credential? credential,
  String? csrf,
  bool control = false,
  bool trusted = true,
}) async {
  final client = HttpClient(context: trusted ? fixtureTrust() : null);
  try {
    final call = await client.openUrl(method, fixtureOrigin.resolve(path));
    call.followRedirects = false;
    if (control) {
      call.headers.set(
        'X-Fixture-Key',
        const String.fromEnvironment('FIXTURE_KEY'),
      );
    }
    if (credential != null) {
      if (!path.startsWith('/api/v1/')) throw StateError('Cookie fuera de API');
      call.cookies.add(Cookie('session', credential.value));
    }
    if (csrf != null) call.headers.set('X-CSRF-Token', csrf);
    final response = await call.close();
    await response.drain<void>();
    return response.statusCode;
  } finally {
    client.close(force: true);
  }
}

Future<void> eventually(WidgetTester tester, bool Function() predicate) async {
  for (var i = 0; i < 100 && !predicate(); i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
  expect(predicate(), isTrue);
}

Future<Database> fixtureDatabase(Owner owner) async => openDatabase(
  '${await getDatabasesPath()}/b_${owner.key}.sqlite',
  singleInstance: false,
  onConfigure: (db) async {
    await db.execute('PRAGMA foreign_keys=ON');
    await db.rawQuery('PRAGMA journal_mode=WAL');
    await db.execute('PRAGMA synchronous=FULL');
  },
);
Future<void> insertFixturePending(Owner owner, String id) async {
  final db = await fixtureDatabase(owner);
  try {
    await db.transaction((tx) async {
      await tx.insert('captures', {
        'client_capture_id': id,
        'phase': 'confirmed',
        'payload_v1': '{"quantity":"37.125","unit":"kg","fixture":true}',
      });
      await tx.insert('outbox', {'client_capture_id': id, 'state': 'pending'});
    });
  } finally {
    await db.close();
  }
}
