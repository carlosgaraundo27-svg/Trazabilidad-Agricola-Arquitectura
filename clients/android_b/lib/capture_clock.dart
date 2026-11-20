import 'package:flutter/services.dart';

import 'capture_policy.dart';

class AndroidCaptureClock implements CaptureClock {
  static const _channel = MethodChannel('org.trazabilidad/session-vault');
  @override
  Future<ClockStamp> now() async {
    final value = await _channel.invokeMapMethod<String, dynamic>('clock');
    if (value == null) throw StateError('Reloj monotónico no disponible');
    return ClockStamp(
      boot: value['boot'] as int?,
      elapsedMs: value['elapsedMs'] as int,
      process: value['process'] as String,
    );
  }
}
