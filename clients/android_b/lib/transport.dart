import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'session.dart';

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
  }) async {
    final uri = destination.origin.resolve(path);
    if (!destination.allow(uri) ||
        (credential != null &&
            credential.origin.origin != destination.origin.origin)) {
      throw const SessionFailure(Failure.protocol);
    }
    if (credential?.expired ?? false) {
      throw const SessionFailure(Failure.needsLogin);
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
          );
        }
        if (response.statusCode == 403) {
          throw const SessionFailure(Failure.permission);
        }
        if (response.statusCode == 409) {
          throw const SessionFailure(Failure.conflict);
        }
        if (![200, 204].contains(response.statusCode)) {
          throw const SessionFailure(Failure.protocol);
        }
        final bytes = <int>[];
        await for (final chunk in response) {
          bytes.addAll(chunk);
          if (bytes.length > 65536) {
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
