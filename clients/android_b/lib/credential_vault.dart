import 'dart:convert';

import 'package:flutter/services.dart';

import 'capture_contract.dart';
import 'capture_policy.dart';
import 'session.dart';

class OfflineProfile {
  final Owner owner;
  final OfflineWindow window;
  final String catalogVersion;
  OfflineProfile({
    required this.owner,
    required this.window,
    required this.catalogVersion,
  });
  Map<String, dynamic> toJson() => {
    'organizationId': owner.organizationId,
    'actorId': owner.actorId,
    'window': window.toJson(),
    'catalogVersion': catalogVersion,
  };
  factory OfflineProfile.fromJson(Map<String, dynamic> value) => OfflineProfile(
    owner: Owner(
      captureId(value['organizationId']),
      captureId(value['actorId']),
    ),
    window: OfflineWindow.fromJson(value['window'] as Map<String, dynamic>),
    catalogVersion: value['catalogVersion'] as String,
  );
}

/// One encrypted atomic record holds the credential and active local profile.
/// All read/modify/write calls are serialized; logout clears both together.
class KeystoreVault implements OfflineIdentityVault {
  final Uri origin;
  static const channel = MethodChannel('org.trazabilidad/session-vault');
  static Future<void> _queue = Future.value();
  KeystoreVault(this.origin);
  Future<T> _exclusive<T>(Future<T> Function() operation) {
    final next = _queue.then((_) => operation());
    _queue = next.then<void>((_) {}, onError: (Object _) {});
    return next;
  }

  Map<String, dynamic> _empty() => {
    'version': 2,
    'origin': origin.origin,
    'credential': null,
    'profile': null,
  };
  Future<Map<String, dynamic>> _readRecord() async {
    final text = await channel.invokeMethod<String>('read');
    if (text == null) return _empty();
    final value = jsonDecode(text) as Map<String, dynamic>;
    if (value['version'] == 2) {
      if (value['origin'] != origin.origin) {
        throw const SessionFailure(Failure.storage);
      }
      return value;
    }
    // The existing B representation is migrated only when modified, never reset.
    Credential.fromJson(value, origin);
    return {..._empty(), 'credential': value};
  }

  Future<void> _modify(
    void Function(Map<String, dynamic>) change, {
    bool Function()? current,
  }) => _exclusive(() async {
    if (current != null && !current()) {
      throw const SessionFailure(Failure.staleGeneration);
    }
    final value = await _readRecord();
    if (current != null && !current()) {
      throw const SessionFailure(Failure.staleGeneration);
    }
    change(value);
    await channel.invokeMethod<void>('write', jsonEncode(value));
    if (current != null && !current()) {
      throw const SessionFailure(Failure.staleGeneration);
    }
  });
  @override
  Future<Credential?> read() => _exclusive(() async {
    final value = (await _readRecord())['credential'];
    return value == null
        ? null
        : Credential.fromJson(value as Map<String, dynamic>, origin);
  });
  @override
  Future<void> write(Credential credential) =>
      _modify((record) => record['credential'] = credential.toJson());
  @override
  Future<void> clear() => _exclusive(() => channel.invokeMethod<void>('clear'));
  Future<OfflineProfile?> readProfile() => _exclusive(() async {
    final value = (await _readRecord())['profile'];
    return value == null
        ? null
        : OfflineProfile.fromJson(value as Map<String, dynamic>);
  });
  @override
  Future<Owner?> activeOwner() async => (await readProfile())?.owner;
  Future<void> grantProfile(OfflineProfile profile, bool Function() current) =>
      _modify(
        (record) => record['profile'] = profile.toJson(),
        current: current,
      );
  @override
  Future<void> invalidateCredential({required bool remote}) =>
      _modify((record) {
        record['credential'] = null;
        if (remote && record['profile'] != null) {
          final profile = OfflineProfile.fromJson(
            record['profile'] as Map<String, dynamic>,
          );
          record['profile'] = OfflineProfile(
            owner: profile.owner,
            window: OfflineWindow(
              serverTime: profile.window.serverTime,
              stamp: profile.window.stamp,
              blocked: true,
            ),
            catalogVersion: profile.catalogVersion,
          ).toJson();
        }
      });
  Future<void> blockProfile(Owner expected) => _modify((record) {
    if (record['profile'] == null) return;
    final profile = OfflineProfile.fromJson(
      record['profile'] as Map<String, dynamic>,
    );
    if (profile.owner.key != expected.key) return;
    record['profile'] = OfflineProfile(
      owner: profile.owner,
      window: OfflineWindow(
        serverTime: profile.window.serverTime,
        stamp: profile.window.stamp,
        blocked: true,
      ),
      catalogVersion: profile.catalogVersion,
    ).toJson();
  });
}
