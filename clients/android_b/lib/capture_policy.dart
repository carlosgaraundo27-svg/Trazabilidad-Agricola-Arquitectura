import 'dart:io';
import 'dart:math';

class ClockStamp {
  final int? boot;
  final int elapsedMs;
  final String process;
  const ClockStamp({
    required this.boot,
    required this.elapsedMs,
    required this.process,
  });
  Map<String, dynamic> toJson() => {
    'boot': boot,
    'elapsedMs': elapsedMs,
    'process': process,
  };
  factory ClockStamp.fromJson(Map<String, dynamic> value) => ClockStamp(
    boot: value['boot'] as int?,
    elapsedMs: value['elapsedMs'] as int,
    process: value['process'] as String,
  );
  bool sameBoot(ClockStamp other) => boot != null && other.boot != null
      ? boot == other.boot
      : boot == null && other.boot == null && process == other.process;
}

abstract interface class CaptureClock {
  Future<ClockStamp> now();
}

class OfflineWindow {
  final DateTime serverTime;
  final ClockStamp stamp;
  final bool blocked;
  static const duration = Duration(hours: 24);
  OfflineWindow({
    required this.serverTime,
    required this.stamp,
    this.blocked = false,
  });
  DateTime? serverNow(ClockStamp now) =>
      stamp.sameBoot(now) && now.elapsedMs >= stamp.elapsedMs
      ? serverTime.add(Duration(milliseconds: now.elapsedMs - stamp.elapsedMs))
      : null;
  bool canConfirm(ClockStamp now) =>
      !blocked &&
      serverNow(now) != null &&
      now.elapsedMs - stamp.elapsedMs < duration.inMilliseconds;
  Map<String, dynamic> toJson() => {
    'serverTime': serverTime.toUtc().toIso8601String(),
    'stamp': stamp.toJson(),
    'blocked': blocked,
  };
  factory OfflineWindow.fromJson(Map<String, dynamic> value) => OfflineWindow(
    serverTime: DateTime.parse(value['serverTime'] as String).toUtc(),
    stamp: ClockStamp.fromJson(value['stamp'] as Map<String, dynamic>),
    blocked: value['blocked'] == true,
  );
}

class RetryPolicy {
  final double Function() jitter;
  RetryPolicy({double Function()? jitter})
    : jitter = jitter ?? Random().nextDouble;
  Duration? afterFailure(int cycleAttempts, {Duration? retryAfter}) {
    if (cycleAttempts < 1 || cycleAttempts >= 6) return null;
    const seconds = [2, 4, 8, 16, 30];
    final random = jitter();
    if (random < 0 || random > 1) throw StateError('Jitter fuera de rango');
    final base = Duration(
      milliseconds: (seconds[cycleAttempts - 1] * 1000 * (1 + random * 0.2))
          .ceil(),
    );
    return retryAfter != null && retryAfter > base ? retryAfter : base;
  }
}

Duration? parseRetryAfter(String? value, String? serverDate) {
  if (value == null) return null;
  if (RegExp(r'^\d+$').hasMatch(value)) {
    final seconds = int.tryParse(value);
    if (seconds == null || seconds > 9223372036854) {
      throw const FormatException('Retry-After fuera de rango');
    }
    return Duration(seconds: seconds);
  }
  if (serverDate == null) {
    throw const FormatException('Retry-After sin referencia de servidor');
  }
  final delta = HttpDate.parse(value).difference(HttpDate.parse(serverDate));
  return delta.isNegative ? Duration.zero : delta;
}

String newCaptureId() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}
