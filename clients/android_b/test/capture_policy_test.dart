import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:trazabilidad_android_b/capture_policy.dart';

void main() {
  const start = ClockStamp(boot: 7, elapsedMs: 1000, process: 'first');
  final window = OfflineWindow(
    serverTime: DateTime.utc(2026, 1, 1),
    stamp: start,
  );
  test('24h exactas incluyen suspension y reinicio app del mismo boot', () {
    expect(
      window.canConfirm(
        const ClockStamp(
          boot: 7,
          elapsedMs: 1000 + 86400000 - 1,
          process: 'reopened',
        ),
      ),
      isTrue,
    );
    expect(
      window.canConfirm(
        const ClockStamp(
          boot: 7,
          elapsedMs: 1000 + 86400000,
          process: 'reopened',
        ),
      ),
      isFalse,
    );
    expect(
      window.serverNow(
        const ClockStamp(boot: 7, elapsedMs: 61000, process: 'reopened'),
      ),
      DateTime.utc(2026, 1, 1, 0, 1),
    );
  });
  test(
    'reboot, contador revertido, desconocido o revocacion no conceden ventana',
    () {
      for (final stamp in [
        const ClockStamp(boot: 8, elapsedMs: 2000, process: 'first'),
        const ClockStamp(boot: 7, elapsedMs: 999, process: 'first'),
        const ClockStamp(boot: null, elapsedMs: 2000, process: 'reopened'),
      ]) {
        expect(window.canConfirm(stamp), isFalse);
      }
      expect(
        OfflineWindow(
          serverTime: window.serverTime,
          stamp: start,
          blocked: true,
        ).canConfirm(
          const ClockStamp(boot: 7, elapsedMs: 2000, process: 'first'),
        ),
        isFalse,
      );
      final uncertain = OfflineWindow(
        serverTime: window.serverTime,
        stamp: const ClockStamp(boot: null, elapsedMs: 1000, process: 'first'),
      );
      expect(
        uncertain.canConfirm(
          const ClockStamp(boot: null, elapsedMs: 2000, process: 'first'),
        ),
        isTrue,
      );
      expect(
        uncertain.canConfirm(
          const ClockStamp(boot: null, elapsedMs: 2000, process: 'other'),
        ),
        isFalse,
      );
    },
  );
  test(
    'primeros cinco fallos esperan; sexto pausa; RetryAfter nunca se trunca',
    () {
      final policy = RetryPolicy(jitter: () => 0.5);
      expect(
        [
          for (var attempt = 1; attempt <= 5; attempt++)
            policy.afterFailure(attempt)!.inMilliseconds,
        ],
        [2200, 4400, 8800, 17600, 33000],
      );
      expect(policy.afterFailure(6), isNull);
      expect(
        policy.afterFailure(1, retryAfter: const Duration(minutes: 3)),
        const Duration(minutes: 3),
      );
    },
  );
  test('RetryAfter HTTP usa Date servidor y rechaza referencias inciertas', () {
    expect(parseRetryAfter('180', null), const Duration(minutes: 3));
    final reference = DateTime.utc(2026, 1, 1);
    expect(
      parseRetryAfter(
        HttpDate.format(reference.add(const Duration(minutes: 5))),
        HttpDate.format(reference),
      ),
      const Duration(minutes: 5),
    );
    expect(
      () => parseRetryAfter('Thu, 01 Jan 2026 00:05:00 GMT', null),
      throwsFormatException,
    );
    expect(() => parseRetryAfter('-1', null), throwsFormatException);
  });
  test('UUID desde primer guardado es v4 sin dependencia de reloj ni red', () {
    final ids = {for (var i = 0; i < 100; i++) newCaptureId()};
    expect(ids.length, 100);
    expect(
      ids.every(
        (id) => RegExp(
          r'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$',
        ).hasMatch(id),
      ),
      isTrue,
    );
  });
}
