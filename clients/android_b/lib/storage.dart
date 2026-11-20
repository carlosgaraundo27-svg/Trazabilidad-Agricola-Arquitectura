import 'package:sqflite/sqflite.dart';

import 'session.dart';
import 'capture_contract.dart';
export 'credential_vault.dart';

/// Private owner-specific SQLite, without credentials. No capture UI, sender or
/// retry worker is part of B. Contract tables preserve the boundary for C.
class SqliteWorkspace implements Workspace {
  Database? _db;
  Owner? _owner;
  WorkspaceLease? _lease;
  WorkspaceLease get lease {
    final value = _lease;
    if (value == null) throw const SessionFailure(Failure.staleGeneration);
    _checked(value);
    return value;
  }

  Database _checked(WorkspaceLease value) {
    if (!identical(_lease, value) ||
        !identical(_db, value._database) ||
        !value._current()) {
      throw const SessionFailure(Failure.staleGeneration);
    }
    return value._database;
  }

  String? get ownerKey => _owner?.key;
  Future<int> get pendingCount async => _db == null
      ? 0
      : Sqflite.firstIntValue(
              await _db!.rawQuery(
                "SELECT count(*) FROM outbox WHERE state <> 'accepted'",
              ),
            ) ??
            0;
  @override
  Future<void> lock() async {
    _lease = null;
    final previous = _db;
    _db = null;
    _owner = null;
    await previous?.close();
  }

  @override
  Future<void> open(Owner owner, bool Function() current) async {
    final uuid = RegExp(r'^[a-fA-F0-9-]{36}$');
    if (!uuid.hasMatch(owner.organizationId) || !uuid.hasMatch(owner.actorId)) {
      throw const SessionFailure(Failure.storage);
    }
    if (!current()) throw const SessionFailure(Failure.staleGeneration);
    await lock();
    final directory = await getDatabasesPath();
    final database = await openDatabase(
      '$directory/b_${owner.key}.sqlite',
      version: 2,
      singleInstance: false,
      onConfigure: (db) async {
        await db.execute('PRAGMA foreign_keys = ON');
        await db.rawQuery('PRAGMA journal_mode = WAL');
        await db.execute('PRAGMA synchronous = FULL');
      },
      onCreate: (db, version) async {
        for (final statement in schema) {
          await db.execute(statement);
        }
        await db.insert('workspace', {
          'id': 1,
          'organization_id': owner.organizationId,
          'actor_id': owner.actorId,
          'schema_version': 1,
        });
        await upgradeC(db);
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) await upgradeC(db);
      },
    );
    try {
      final metadata = await database.query('workspace');
      if (metadata.length != 1 ||
          metadata.single['organization_id'] != owner.organizationId ||
          metadata.single['actor_id'] != owner.actorId ||
          metadata.single['schema_version'] != 1 ||
          Sqflite.firstIntValue(
                await database.rawQuery('PRAGMA foreign_keys'),
              ) !=
              1 ||
          Sqflite.firstIntValue(
                await database.rawQuery('PRAGMA synchronous'),
              ) !=
              2 ||
          (await database.rawQuery('PRAGMA journal_mode'))
                  .single
                  .values
                  .single !=
              'wal') {
        throw const SessionFailure(Failure.storage);
      }
      if (!current()) throw const SessionFailure(Failure.staleGeneration);
      _db = database;
      _owner = owner;
      _lease = WorkspaceLease._(database, current);
    } catch (_) {
      await database.close();
      rethrow;
    }
  }

  Future<T> transaction<T>(
    WorkspaceLease lease,
    Future<T> Function(Transaction) operation,
  ) async {
    final db = _checked(lease);
    return db.transaction((tx) async {
      _checked(lease);
      final result = await operation(tx);
      _checked(lease);
      return result;
    });
  }

  static Future<void> upgradeC(DatabaseExecutor db) async {
    for (final statement in schemaC) {
      await db.execute(statement);
    }
  }

  // workspace.schema_version=1 remains the owner contract; PRAGMA user_version=2
  // describes this additive local migration. Published server DDL is untouched.
  static const schemaC = <String>[
    'CREATE TABLE catalog_parcels(id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,enabled INTEGER NOT NULL CHECK(enabled IN (0,1)))',
    'CREATE TABLE catalog_meta(id INTEGER PRIMARY KEY CHECK(id=1),version TEXT NOT NULL)',
    'ALTER TABLE outbox ADD COLUMN cycle INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE outbox ADD COLUMN cycle_attempts INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE outbox ADD COLUMN deadline TEXT',
    'ALTER TABLE outbox ADD COLUMN retry_delay_ms INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE outbox ADD COLUMN last_code TEXT',
  ];

  Future<void> saveDraft(
    WorkspaceLease lease,
    String identity,
    PayloadV1 payload,
  ) async {
    final db = _checked(lease), id = captureId(identity);
    await db.transaction((tx) async {
      _checked(lease);
      final existing = await tx.query(
        'captures',
        where: 'client_capture_id=?',
        whereArgs: [id],
      );
      if (existing.isEmpty) {
        await tx.insert('captures', {
          'client_capture_id': id,
          'phase': 'draft',
          'payload_v1': payload.canonical,
        });
      } else {
        if (existing.single['phase'] != 'draft') {
          throw const SessionFailure(Failure.conflict);
        }
        await tx.update(
          'captures',
          {'payload_v1': payload.canonical},
          where: 'client_capture_id=? AND phase=?',
          whereArgs: [id, 'draft'],
        );
      }
      _checked(lease);
    });
  }

  Future<void> confirm(
    WorkspaceLease lease,
    String identity,
    PayloadV1 payload,
  ) async {
    final db = _checked(lease), id = captureId(identity);
    await db.transaction((tx) async {
      _checked(lease);
      final rows = await tx.query(
        'captures',
        where: 'client_capture_id=?',
        whereArgs: [id],
      );
      if (rows.length != 1 || rows.single['payload_v1'] != payload.canonical) {
        throw const SessionFailure(Failure.conflict);
      }
      if (rows.single['phase'] == 'confirmed') {
        if ((await tx.query(
              'outbox',
              where: 'client_capture_id=?',
              whereArgs: [id],
            )).length !=
            1) {
          throw const SessionFailure(Failure.conflict);
        }
      } else {
        await tx.update(
          'captures',
          {'phase': 'confirmed'},
          where: 'client_capture_id=? AND phase=?',
          whereArgs: [id, 'draft'],
        );
        await tx.insert('outbox', {
          'client_capture_id': id,
          'state': 'pending',
        });
      }
      _checked(lease);
    });
  }

  Future<void> recordAck(WorkspaceLease lease, CaptureReceipt receipt) async {
    final db = _checked(lease);
    await db.transaction((tx) async {
      _checked(lease);
      final capture = await tx.query(
        'captures',
        where: 'client_capture_id=? AND phase=?',
        whereArgs: [receipt.id, 'confirmed'],
      );
      if (capture.length != 1 ||
          capture.single['payload_v1'] != receipt.payload.canonical) {
        throw const SessionFailure(Failure.conflict);
      }
      final existing = await tx.query(
        'receipts',
        where: 'client_capture_id=?',
        whereArgs: [receipt.id],
      );
      if (existing.isNotEmpty) {
        if (existing.single['result_json'] != receipt.canonical) {
          throw const SessionFailure(Failure.conflict);
        }
      } else {
        await tx.insert('receipts', {
          'client_capture_id': receipt.id,
          'pre_lot_id': receipt.preLotId,
          'harvest_id': receipt.harvestId,
          'accepted_at': receipt.acceptedAt,
          'result_json': receipt.canonical,
        });
        final changed = await tx.update(
          'outbox',
          {'state': 'accepted'},
          where: 'client_capture_id=?',
          whereArgs: [receipt.id],
        );
        if (changed != 1) throw const SessionFailure(Failure.conflict);
      }
      _checked(lease);
    });
  }

  static const schema = <String>[
    'CREATE TABLE workspace (id INTEGER PRIMARY KEY CHECK(id=1), organization_id TEXT NOT NULL, actor_id TEXT NOT NULL, schema_version INTEGER NOT NULL CHECK(schema_version=1))',
    "CREATE TABLE captures (client_capture_id TEXT PRIMARY KEY NOT NULL, workspace_id INTEGER NOT NULL DEFAULT 1 CHECK(workspace_id=1), phase TEXT NOT NULL CHECK(phase IN ('draft','confirmed')), payload_v1 TEXT NOT NULL CHECK(length(payload_v1)>0), FOREIGN KEY(workspace_id) REFERENCES workspace(id), UNIQUE(client_capture_id,phase))",
    "CREATE TABLE outbox (client_capture_id TEXT PRIMARY KEY NOT NULL, capture_phase TEXT NOT NULL DEFAULT 'confirmed' CHECK(capture_phase='confirmed'), state TEXT NOT NULL CHECK(state IN ('pending','in_flight','uncertain','accepted','needs_login','intervention')), attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0), FOREIGN KEY(client_capture_id,capture_phase) REFERENCES captures(client_capture_id,phase))",
    'CREATE TABLE receipts (client_capture_id TEXT PRIMARY KEY NOT NULL REFERENCES outbox(client_capture_id), pre_lot_id TEXT NOT NULL UNIQUE, harvest_id TEXT NOT NULL UNIQUE, accepted_at TEXT NOT NULL, result_json TEXT NOT NULL)',
    "CREATE TRIGGER confirmed_no_update BEFORE UPDATE ON captures WHEN OLD.phase='confirmed' BEGIN SELECT RAISE(ABORT,'confirmed capture is immutable'); END",
    "CREATE TRIGGER confirmed_no_delete BEFORE DELETE ON captures WHEN OLD.phase='confirmed' BEGIN SELECT RAISE(ABORT,'confirmed capture is immutable'); END",
    "CREATE TRIGGER capture_id_no_update BEFORE UPDATE OF client_capture_id ON captures BEGIN SELECT RAISE(ABORT,'capture identity is immutable'); END",
    "CREATE TRIGGER receipt_no_update BEFORE UPDATE ON receipts BEGIN SELECT RAISE(ABORT,'receipt is immutable'); END",
    "CREATE TRIGGER receipt_no_delete BEFORE DELETE ON receipts BEGIN SELECT RAISE(ABORT,'receipt is immutable'); END",
  ];
}

/// Opaque capability captured when the owner/generation is validated. A callback
/// must carry its original lease; it cannot silently use the next user's file.
class WorkspaceLease {
  final Database _database;
  final bool Function() _current;
  WorkspaceLease._(this._database, this._current);
}
