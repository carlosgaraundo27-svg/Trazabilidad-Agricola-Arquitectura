import 'dart:convert';

import 'package:sqflite/sqflite.dart';

import 'capture_catalog.dart';
import 'capture_contract.dart';
import 'capture_policy.dart';
import 'session.dart';
import 'storage.dart';

class QueueItem {
  final String id, payload, state;
  final int attempts, cycleAttempts;
  final String? code;
  QueueItem(Map<String, Object?> r)
    : id = r['client_capture_id'] as String,
      payload = r['payload_v1'] as String,
      state = (r['state'] ?? 'draft') as String,
      attempts = (r['attempts'] ?? 0) as int,
      cycleAttempts = (r['cycle_attempts'] ?? 0) as int,
      code = r['last_code'] as String?;
  Map<String, dynamic> get fields =>
      jsonDecode(payload) as Map<String, dynamic>;
  String get label => switch (state) {
    'draft' => 'Borrador',
    'pending' => 'Pendiente',
    'uncertain' => 'Pendiente: resultado incierto',
    'in_flight' => 'Enviando',
    'accepted' => 'Sincronizado',
    'needs_login' => 'Requiere autenticación',
    _ => 'Conflicto/error',
  };
}

class CaptureStore {
  final SqliteWorkspace workspace;
  final WorkspaceLease lease;
  CaptureStore(this.workspace, this.lease);
  Future<T> _tx<T>(Future<T> Function(Transaction) operation) =>
      workspace.transaction(lease, operation);
  Future<List<QueueItem>> rows() => _tx(
    (tx) async => (await tx.rawQuery(
      'SELECT c.*,o.state,o.attempts,o.cycle_attempts,o.last_code FROM captures c LEFT JOIN outbox o USING(client_capture_id) ORDER BY c.rowid DESC',
    )).map(QueueItem.new).toList(),
  );
  Future<List<Map<String, Object?>>> parcels() => _tx(
    (tx) => tx.query('catalog_parcels', where: 'enabled=1', orderBy: 'name,id'),
  );
  Future<String?> catalogVersion() => _tx((tx) async {
    final r = await tx.query('catalog_meta');
    return r.isEmpty ? null : r.single['version'] as String;
  });
  Future<void> replaceCatalog(CatalogSnapshot snapshot) => _tx((tx) async {
    await tx.update('catalog_parcels', {'enabled': 0});
    for (final p in snapshot.parcels) {
      await tx.insert('catalog_parcels', {
        'id': p['id'],
        'name': p['name'],
        'enabled': 1,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await tx.insert('catalog_meta', {
      'id': 1,
      'version': snapshot.version,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  });
  Future<void> disableParcel(String id) => _tx((tx) async {
    await tx.update(
      'catalog_parcels',
      {'enabled': 0},
      where: 'id=?',
      whereArgs: [id],
    );
  });
  Future<void> saveDraft(String identity, Map<String, String> fields) =>
      _tx((tx) async {
        final id = captureId(identity);
        exactKeys(fields, {'parcelId', 'harvestedAt', 'quantity', 'unit'});
        if (fields.values.any((s) => s.length > 200)) {
          throw const SessionFailure(Failure.protocol);
        }
        final old = await tx.query(
          'captures',
          where: 'client_capture_id=?',
          whereArgs: [id],
        );
        if (old.isEmpty) {
          await tx.insert('captures', {
            'client_capture_id': id,
            'phase': 'draft',
            'payload_v1': jsonEncode(fields),
          });
        } else {
          if (old.single['phase'] != 'draft') {
            throw const SessionFailure(Failure.conflict);
          }
          await tx.update(
            'captures',
            {'payload_v1': jsonEncode(fields)},
            where: 'client_capture_id=?',
            whereArgs: [id],
          );
        }
      });
  Future<void> confirm(
    String identity,
    OfflineWindow window,
    ClockStamp stamp,
  ) => _tx((tx) async {
    if (!window.canConfirm(stamp)) {
      throw const SessionFailure(Failure.needsLogin);
    }
    final id = captureId(identity),
        rows = await tx.query(
          'captures',
          where: 'client_capture_id=? AND phase=?',
          whereArgs: [id, 'draft'],
        );
    if (rows.length != 1) throw const SessionFailure(Failure.conflict);
    final raw =
        jsonDecode(rows.single['payload_v1'] as String) as Map<String, dynamic>;
    final payload = PayloadV1.parse({
      'schemaVersion': 1,
      ...raw,
    }, rejectFuture: false);
    if (DateTime.parse(payload.body['harvestedAt'] as String)
        .isAfter(window.serverNow(stamp)!)) {
      throw const SessionFailure(Failure.protocol);
    }
    if ((await tx.query(
      'catalog_parcels',
      where: 'id=? AND enabled=1',
      whereArgs: [payload.body['parcelId']],
    )).isEmpty) {
      throw const SessionFailure(Failure.permission);
    }
    await tx.update(
      'captures',
      {'phase': 'confirmed', 'payload_v1': payload.canonical},
      where: 'client_capture_id=? AND phase=?',
      whereArgs: [id, 'draft'],
    );
    await tx.insert('outbox', {'client_capture_id': id, 'state': 'pending'});
  });
  Future<void> recover() => _tx((tx) async {
    await tx.update(
      'outbox',
      {'state': 'uncertain', 'last_code': 'PROCESS_INTERRUPTED'},
      where: 'state=?',
      whereArgs: ['in_flight'],
    );
  });
  Future<void> newCycle() => _tx((tx) async {
    // Manual retry retains total attempts, ID and immutable content. It cannot
    // bypass an outstanding server deadline or an unresolved conflict.
    await tx.rawUpdate(
      "UPDATE outbox SET cycle=cycle+1,cycle_attempts=0,state='pending',last_code=NULL WHERE state IN ('intervention','needs_login') AND (last_code IN ('RETRY_EXHAUSTED','403','404') OR state='needs_login')",
    );
  });
  Future<void> requireLogin() => _tx((tx) async {
    await tx.rawUpdate(
      "UPDATE outbox SET state='needs_login',last_code='401' WHERE state IN ('pending','uncertain')",
    );
  });
  Future<void> requirePermission() => _tx((tx) async {
    await tx.rawUpdate(
      "UPDATE outbox SET state='intervention',last_code='403' WHERE state IN ('pending','uncertain')",
    );
  });
  Future<QueueItem?> claim(ClockStamp now, RetryPolicy policy) =>
      _tx((tx) async {
        if ((await tx.query(
          'outbox',
          where: 'state=?',
          whereArgs: ['in_flight'],
          limit: 1,
        )).isNotEmpty) {
          return null;
        }
        final rows = await tx.rawQuery(
          "SELECT c.payload_v1,o.* FROM outbox o JOIN captures c USING(client_capture_id) WHERE o.state IN ('pending','uncertain') ORDER BY o.rowid",
        );
        for (final row in rows) {
          final id = row['client_capture_id'] as String,
              deadline = row['deadline'] as String?;
          if (deadline != null) {
            final prior = ClockStamp.fromJson(
              jsonDecode(deadline) as Map<String, dynamic>,
            );
            if (!prior.sameBoot(now)) {
              await tx.update(
                'outbox',
                {
                  'deadline': jsonEncode(
                    ClockStamp(
                      boot: now.boot,
                      elapsedMs: now.elapsedMs + (row['retry_delay_ms'] as int),
                      process: now.process,
                    ).toJson(),
                  ),
                },
                where: 'client_capture_id=?',
                whereArgs: [id],
              );
              continue;
            }
            if (now.elapsedMs < prior.elapsedMs) continue;
          }
          final attempts = (row['cycle_attempts'] as int) + 1;
          if (attempts > 6) {
            await tx.update(
              'outbox',
              {'state': 'intervention', 'last_code': 'RETRY_EXHAUSTED'},
              where: 'client_capture_id=?',
              whereArgs: [id],
            );
            continue;
          }
          final delay = policy.afterFailure(attempts) ?? Duration.zero;
          final changes = {
            'state': 'in_flight',
            'attempts': (row['attempts'] as int) + 1,
            'cycle_attempts': attempts,
            'deadline': jsonEncode(
              ClockStamp(
                boot: now.boot,
                elapsedMs: now.elapsedMs + delay.inMilliseconds,
                process: now.process,
              ).toJson(),
            ),
            'retry_delay_ms': delay.inMilliseconds,
            'last_code': null,
          };
          await tx.update(
            'outbox',
            changes,
            where: 'client_capture_id=?',
            whereArgs: [id],
          );
          return QueueItem({...row, ...changes});
        }
        return null;
      });
  Future<void> failed(
    QueueItem item,
    ClockStamp now,
    RetryPolicy policy,
    SessionFailure error,
  ) => _tx((tx) async {
    final retry = policy.afterFailure(
      item.cycleAttempts,
      retryAfter: error.retryAfter,
    );
    final network = error.kind == Failure.network;
    final exhausted = network && retry == null;
    final state = error.kind == Failure.needsLogin
        ? 'needs_login'
        : network && !exhausted
        ? 'uncertain'
        : 'intervention';
    final delay = retry ?? error.retryAfter ?? Duration.zero;
    final code = exhausted
        ? 'RETRY_EXHAUSTED'
        : error.status?.toString() ?? error.kind.name;
    await tx.update(
      'outbox',
      {
        'state': state,
        'last_code': code,
        'retry_delay_ms': delay.inMilliseconds,
        'deadline': jsonEncode(
          ClockStamp(
            boot: now.boot,
            elapsedMs: now.elapsedMs + delay.inMilliseconds,
            process: now.process,
          ).toJson(),
        ),
      },
      where: 'client_capture_id=? AND state=?',
      whereArgs: [item.id, 'in_flight'],
    );
  });
  Future<void> ack(CaptureReceipt receipt) =>
      workspace.recordAck(lease, receipt);
  Future<Duration?> nextWait(ClockStamp now) => _tx((tx) async {
    final rows = await tx.query(
      'outbox',
      where: "state IN ('pending','uncertain')",
    );
    int? minimum;
    for (final r in rows) {
      final raw = r['deadline'] as String?;
      final deadline = raw == null
          ? null
          : ClockStamp.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      final wait = deadline == null
          ? 0
          : deadline.sameBoot(now)
          ? deadline.elapsedMs - now.elapsedMs
          : r['retry_delay_ms'] as int;
      final ms = wait < 0 ? 0 : wait;
      if (minimum == null || ms < minimum) minimum = ms;
    }
    return minimum == null ? null : Duration(milliseconds: minimum);
  });
}
