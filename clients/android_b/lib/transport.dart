import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'session.dart';
import 'capture_catalog.dart';
import 'capture_contract.dart';
import 'capture_policy.dart';

CaptureReceipt parseCaptureResponse(
  int status,
  Map<String, dynamic> body,
  String id,
  Map<String, dynamic> payload,
) {
  final replayed = body['replayed'];
  if (!((status == 201 && replayed == false) ||
      (status == 200 && replayed == true))) {
    throw const SessionFailure(Failure.protocol);
  }
  final receipt = CaptureReceipt.parse({...body}..remove('replayed'));
  if (receipt.id != id ||
      receipt.payload.canonical !=
          PayloadV1.parse(payload, rejectFuture: false).canonical) {
    throw const SessionFailure(Failure.conflict);
  }
  return receipt;
}

class HttpsSessionApi implements SessionApi {
  final Destination destination;
  final SecurityContext? context;
  final _clients = <HttpClient>{};
  HttpsSessionApi(Uri origin, {this.context})
    : destination = Destination(origin);
  @override
  void cancel() {
    for (final client in _clients.toList()) {
      client.close(force: true);
    }
    _clients.clear();
  }

  Future<({Map<String, dynamic> body, List<Cookie> cookies, int status})>
  _request(
    String method,
    String path, {
    Map<String, String>? body,
    Credential? credential,
    String? csrf,
    String? frozen,
    String? idempotencyKey,
    int maxBytes = 65536,
  }) async {
    final uri = destination.origin.resolve(path);
    if (!destination.allow(uri) ||
        (credential != null &&
            credential.origin.origin != destination.origin.origin)) {
      throw const SessionFailure(Failure.protocol);
    }
    if (credential?.expired ?? false) {
      throw const SessionFailure(Failure.needsLogin, localExpiry: true);
    }
    final client = HttpClient(context: context)
      ..connectionTimeout = const Duration(seconds: 10);
    _clients.add(client);
    try {
      return await (() async {
        final request = await client.openUrl(method, uri);
        request.followRedirects = false;
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        request.headers.set('Origin', destination.origin.origin);
        if (credential != null) {
          request.cookies.add(Cookie('session', credential.value));
        }
        if (csrf != null) request.headers.set('X-CSRF-Token', csrf);
        if (idempotencyKey != null) {
          request.headers.set('Idempotency-Key', idempotencyKey);
        }
        if (frozen != null) {
          request.headers.contentType = ContentType.json;
          request.write(frozen);
        }
        if (body != null) {
          request.headers.contentType = ContentType.json;
          request.write(jsonEncode(body));
        }
        final response = await request.close();
        if (response.statusCode == 401) {
          throw SessionFailure(
            path == '/api/v1/auth/login'
                ? Failure.invalidCredentials
                : Failure.needsLogin,
            status: 401,
          );
        }
        if ([403, 404].contains(response.statusCode)) {
          throw SessionFailure(Failure.permission, status: response.statusCode);
        }
        if (response.statusCode == 409) {
          throw const SessionFailure(Failure.conflict, status: 409);
        }
        if (response.statusCode == 429 || response.statusCode >= 500) {
          throw SessionFailure(
            Failure.network,
            status: response.statusCode,
            retryAfter: parseRetryAfter(
              response.headers.value('retry-after'),
              response.headers.value('date'),
            ),
          );
        }
        if (![200, 201, 204].contains(response.statusCode)) {
          throw SessionFailure(Failure.protocol, status: response.statusCode);
        }
        final bytes = <int>[];
        await for (final chunk in response) {
          bytes.addAll(chunk);
          if (bytes.length > maxBytes) {
            throw const SessionFailure(Failure.protocol);
          }
        }
        final result = response.statusCode == 204
            ? <String, dynamic>{}
            : jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
        return (
          body: result,
          cookies: response.cookies,
          status: response.statusCode,
        );
      })().timeout(const Duration(seconds: 15));
    } on SessionFailure {
      rethrow;
    } on SocketException {
      throw const SessionFailure(Failure.network);
    } on HandshakeException {
      throw const SessionFailure(Failure.network);
    } on TimeoutException {
      throw const SessionFailure(Failure.network);
    } on HttpException {
      throw const SessionFailure(Failure.network);
    } on FormatException {
      throw const SessionFailure(Failure.protocol);
    } finally {
      _clients.remove(client);
      client.close(force: true);
    }
  }

  Future<CatalogSnapshot> catalog(Credential credential) async =>
      CatalogSnapshot.parse(
        (await _request(
          'GET',
          '/api/v1/sync/catalog',
          credential: credential,
          maxBytes: 524288,
        )).body,
      );
  Future<CaptureReceipt> sendCapture(
    Credential credential,
    String csrf,
    String id,
    String frozen,
  ) async {
    captureId(id);
    final result = await _request(
      'PUT',
      '/api/v1/sync/pre-lots/$id',
      credential: credential,
      csrf: csrf,
      frozen: frozen,
      idempotencyKey: id,
    );
    return parseCaptureResponse(
      result.status,
      result.body,
      id,
      jsonDecode(frozen) as Map<String, dynamic>,
    );
  }

  @override
  Future<Credential> login(String email, String password) async {
    final result = await _request(
      'POST',
      '/api/v1/auth/login',
      body: {'email': email, 'password': password},
    );
    final cookies = result.cookies
        .where((cookie) => cookie.name == 'session')
        .toList();
    if (result.status != 200 || cookies.length != 1) {
      throw const SessionFailure(Failure.protocol);
    }
    return Credential.fromCookie(
      cookies.single,
      destination.origin,
      DateTime.now().toUtc(),
    );
  }

  @override
  Future<Identity> me(Credential credential) async {
    final result = await _request(
      'GET',
      '/api/v1/auth/me',
      credential: credential,
    );
    final user = result.body['user'];
    final csrf = result.body['csrfToken'];
    final uuid = RegExp(
      r'^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
    );
    if (user is! Map<String, dynamic> ||
        user['organizationId'] is! String ||
        user['id'] is! String ||
        !uuid.hasMatch(user['organizationId'] as String) ||
        !uuid.hasMatch(user['id'] as String) ||
        csrf is! String ||
        !RegExp(r'^[a-f0-9]{64}$').hasMatch(csrf)) {
      throw const SessionFailure(Failure.protocol);
    }
    return Identity(
      Owner(user['organizationId'] as String, user['id'] as String),
      csrf,
    );
  }

  @override
  Future<bool> logout(Credential credential, String csrf) async =>
      (await _request(
        'POST',
        '/api/v1/auth/logout',
        credential: credential,
        csrf: csrf,
      )).status ==
      204;
}
