"""Run from ordinary PowerShell with working Docker access. Never starts source DBs.

Logical dumps + restore into NEW databases only. No physical data-directory access,
container/volume removal, migrations, seed, permission changes or SDK execution.
"""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.request
import uuid
from snapshot_compare import compare_snapshots

ROOT = Path(__file__).resolve().parents[2] / '.local' / 'reactivacion-C-20261118'
DOCKER = Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs/DockerDesktop/resources/bin/docker.exe'
EXPECTED_SYSTEM_ID = '7707318725026357291'


def database_name(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]{0,62}', value):
        raise ValueError('Unsupported PostgreSQL database/role identifier')
    return value


def container_name(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,127}', value):
        raise ValueError('Unsupported Docker container identifier')
    return value


TOOL_FORMS = {
    'psql': [('--version',), ('-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', '@name', '-d', '@name', '-c', '@query')],
    'pg_dump': [('--version',), ('-U', '@name', '-d', '@name', '--format=custom', '@snapshot')],
    'pg_restore': [('--version',), ('--list',), ('-U', '@name', '-d', '@name', '--no-owner', '--no-privileges', '--exit-on-error', '--single-transaction')],
    'createdb': [('-U', '@name', '-T', 'template0', '--', '@name')],
}
METADATA_QUERIES = {
    'SELECT system_identifier::text FROM pg_control_system()',
    'SELECT rolsuper FROM pg_roles WHERE rolname=current_user',
    'SELECT datname FROM pg_database WHERE datallowconn AND NOT datistemplate ORDER BY datname',
    'SELECT version()',
}


def allowed_token(value, specification):
    if specification == '@name':
        return bool(re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]{0,62}', value))
    if specification == '@snapshot':
        return bool(re.fullmatch(r'--snapshot=[0-9A-F]+-[0-9A-F]+-\d+', value))
    if specification == '@query':
        return value in METADATA_QUERIES or bool(re.fullmatch(
            r"SELECT count\(\*\) FROM pg_database WHERE datname='recovery_restore_\d{8}_\d{6}_[a-f0-9]{10}'", value))
    return value == specification


def tool_arguments(tool, values):
    for form in TOOL_FORMS.get(tool, []):
        if len(form) == len(values) and all(allowed_token(value, spec) for value, spec in zip(values, form)):
            # Rebuild literal flags from the fixed grammar, not caller-supplied switches.
            return [value if spec.startswith('@') else spec for value, spec in zip(values, form)]
    raise ValueError('Unsupported tool flags or metadata query')


def command_arguments(args):
    if args[:1] == ['inspect'] and len(args) == 2:
        return ['inspect', container_name(args[1])]
    if args[:2] == ['image', 'inspect'] and len(args) == 3:
        if not re.fullmatch(r'sha256:[a-f0-9]{64}', args[2]):
            raise ValueError('Invalid image config digest')
        return ['image', 'inspect', args[2]]
    if args[:1] != ['exec']:
        raise ValueError('Unsupported Docker operation')
    tail = args[1:]
    options = []
    if tail[:1] == ['-i']:
        options = ['-i']
        tail = tail[1:]
    if len(tail) < 2 or tail[1] not in ('psql', 'pg_dump', 'pg_restore', 'createdb'):
        raise ValueError('Unsupported container command')
    return ['exec', *options, container_name(tail[0]), tail[1], *tool_arguments(tail[1], tail[2:])]


def run(args, *, data=None, stdout=None, timeout=120):
    safe_args = command_arguments(args)
    r = subprocess.run([str(DOCKER), *safe_args], input=data, stdout=stdout or subprocess.PIPE,
                       stderr=subprocess.PIPE, timeout=timeout)
    if r.returncode:
        raise RuntimeError('Docker command failed: ' + str(args[:2]) + '\n' +
                           r.stderr.decode('utf-8', 'replace'))
    return r.stdout


def official_postgres_image(image_id):
    """Verify digest against HTTPS official library/postgres manifests, no pull."""
    info = json.loads(run(['image', 'inspect', image_id]))[0]
    refs = [v for v in info.get('RepoDigests', [])
            if v.startswith(('postgres@sha256:', 'docker.io/library/postgres@sha256:'))]
    if not refs:
        raise RuntimeError('No official postgres repository digest; stop before executing tools')
    url = 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/postgres:pull'
    with urllib.request.urlopen(url, timeout=25) as r:
        token = json.load(r)['token']
    accept = ', '.join(['application/vnd.oci.image.index.v1+json',
                        'application/vnd.oci.image.manifest.v1+json',
                        'application/vnd.docker.distribution.manifest.list.v2+json',
                        'application/vnd.docker.distribution.manifest.v2+json'])

    def manifest(digest):
        if not re.fullmatch(r'sha256:[0-9a-f]{64}', digest):
            raise RuntimeError('Invalid manifest digest')
        req = urllib.request.Request('https://registry-1.docker.io/v2/library/postgres/manifests/' + digest,
                                     headers={'Authorization': 'Bearer ' + token, 'Accept': accept})
        with urllib.request.urlopen(req, timeout=25) as r:
            body = r.read()
        if 'sha256:' + hashlib.sha256(body).hexdigest() != digest:
            raise RuntimeError('Official manifest digest mismatch')
        return json.loads(body)

    for ref in refs:
        doc = manifest(ref.split('@', 1)[1])
        proof = platform_image_proof(doc, info, image_id, manifest)
        if proof is not None:
            return {'repositoryDigest': ref, **proof}
    raise RuntimeError('Local image config does not match official manifest')


def platform_image_proof(doc, info, image_id, manifest):
    if 'manifests' not in doc:
        if doc.get('config', {}).get('digest') == image_id:
            return {'imageConfigDigest': image_id, 'officialHttpsVerified': True}
        return None
    matches = [m for m in doc['manifests']
               if m.get('platform', {}).get('os') == info['Os']
               and m.get('platform', {}).get('architecture') == info['Architecture']]
    for match in matches:
        platform_doc = manifest(match['digest'])
        if platform_doc.get('config', {}).get('digest') == image_id:
            return {'platformManifest': match['digest'], 'imageConfigDigest': image_id,
                    'officialHttpsVerified': True}
    return None


def ident(value):
    return '"' + value.replace('"', '""') + '"'


class Session:
    """Persistent psql transaction holds the snapshot used by pg_dump."""
    def __init__(self, container, user, database, log):
        container, user, database = container_name(container), database_name(user), database_name(database)
        self.log = log.open('xb')
        self.p = subprocess.Popen([str(DOCKER), 'exec', '-i', container,
                                   'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
                                   '-U', user, '-d', database], stdin=subprocess.PIPE,
                                  stdout=subprocess.PIPE, stderr=self.log)

    def sql(self, sql):
        marker = 'RECOVERY_END_' + uuid.uuid4().hex
        self.p.stdin.write((sql + '\nSELECT \'' + marker + "';\n").encode())
        self.p.stdin.flush()
        rows = []
        while True:
            line = self.p.stdout.readline()
            if not line:
                raise RuntimeError('psql ended before completion; see private stderr log')
            line = line.decode('utf-8').strip()
            if line == marker:
                return rows
            if line:
                rows.append(line)

    def start(self):
        self.sql("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL client_encoding='UTF8'; SET LOCAL statement_timeout='30s'; "
                 "SET LOCAL TIME ZONE 'UTC'; SET LOCAL DateStyle='ISO'; SET LOCAL extra_float_digits=3;")

    def close(self):
        if self.p.poll() is None:
            try:
                self.p.stdin.write(b'ROLLBACK;\n\\q\n')
                self.p.stdin.flush()
                self.p.stdin.close()
                self.p.wait(timeout=15)
            except (BrokenPipeError, subprocess.TimeoutExpired):
                self.p.terminate()
                self.p.wait(timeout=10)
        self.log.close()


def fingerprint(s):
    tables = json.loads(s.sql("SELECT coalesce(json_agg(json_build_object('schema',n.nspname,'table',c.relname) "
                             "ORDER BY n.nspname,c.relname),'[]'::json) FROM pg_class c JOIN pg_namespace n "
                             "ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') "
                             "AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema';")[0])
    result = {'tables': [], 'migrations': [], 'foreignKeyOrphans': []}
    for item in tables:
        table = ident(item['schema']) + '.' + ident(item['table'])
        rowhash = "encode(sha256(convert_to(row_to_json(t)::text,'UTF8')),'hex')"
        sql = "SELECT json_build_object('rows',count(*),'sha256Rows',encode(sha256(convert_to(coalesce(" \
              "string_agg(" + rowhash + ",' ' ORDER BY " + rowhash + "),''),'UTF8')),'hex')) FROM " + table + ' t;'
        result['tables'].append({**item, **json.loads(s.sql(sql)[0])})
    names = {(t['schema'], t['table']) for t in tables}
    if ('public', 'schema_migrations') in names:
        result['migrations'] = s.sql('SELECT version FROM public.schema_migrations ORDER BY version;')
    result['constraints'] = json.loads(s.sql("SELECT coalesce(json_agg(json_build_object('schema',n.nspname,"
                                           "'table',r.relname,'name',c.conname,'type',c.contype,"
                                           "'validated',c.convalidated,'definition',pg_get_constraintdef(c.oid)) "
                                           "ORDER BY n.nspname,r.relname,c.conname),'[]'::json) "
                                           "FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid "
                                           "JOIN pg_namespace n ON n.oid=r.relnamespace "
                                           "WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema';")[0])
    keys = json.loads(s.sql("SELECT coalesce(json_agg(json_build_object('schema',ns.nspname,'table',sc.relname,"
                            "'targetSchema',nt.nspname,'targetTable',tc.relname,'name',c.conname,"
                            "'columns',(SELECT json_agg(a.attname ORDER BY k.o) FROM unnest(c.conkey) WITH ORDINALITY k(v,o) "
                            "JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.v),"
                            "'targetColumns',(SELECT json_agg(a.attname ORDER BY k.o) FROM unnest(c.confkey) WITH ORDINALITY k(v,o) "
                            "JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.v)) ORDER BY ns.nspname,sc.relname,c.conname),'[]'::json) "
                            "FROM pg_constraint c JOIN pg_class sc ON sc.oid=c.conrelid JOIN pg_class tc ON tc.oid=c.confrelid "
                            "JOIN pg_namespace ns ON ns.oid=sc.relnamespace JOIN pg_namespace nt ON nt.oid=tc.relnamespace "
                            "WHERE c.contype='f' AND ns.nspname NOT LIKE 'pg_%';")[0])
    for key in keys:
        left = ident(key['schema']) + '.' + ident(key['table'])
        right = ident(key['targetSchema']) + '.' + ident(key['targetTable'])
        present = ' AND '.join('s.' + ident(v) + ' IS NOT NULL' for v in key['columns'])
        join = ' AND '.join('s.' + ident(a) + '=t.' + ident(b)
                            for a, b in zip(key['columns'], key['targetColumns']))
        count = int(s.sql('SELECT count(*) FROM ' + left + ' s WHERE ' + present +
                          ' AND NOT EXISTS(SELECT 1 FROM ' + right + ' t WHERE ' + join + ');')[0])
        result['foreignKeyOrphans'].append({'schema': key['schema'], 'table': key['table'],
                                            'constraint': key['name'], 'orphans': count})
    return result


def backup_database(container, user, number, database, dest, report, base):
    stem = str(number) + '_' + hashlib.sha256(database.encode()).hexdigest()[:12]
    result = {'database': database, 'status': 'in_progress'}
    report['results'].append(result)
    source = Session(container, user, database, dest / (stem + '-source-psql.log'))
    try:
        source.start()
        snapshot = source.sql('SELECT pg_export_snapshot();')[0]
        if not re.fullmatch(r'[0-9A-F]+-[0-9A-F]+-\d+', snapshot):
            raise RuntimeError('Unexpected exported snapshot')
        before = fingerprint(source)
        archive = dest / (stem + '.dump')
        with archive.open('xb') as f:
            run(['exec', container, 'pg_dump', '-U', user, '-d', database,
                 '--format=custom', '--snapshot=' + snapshot], stdout=f, timeout=300)
            f.flush()
            os.fsync(f.fileno())
        result.update({'dump': archive.name, 'bytes': archive.stat().st_size,
                       'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'source': before})
    finally:
        source.close()
    data = archive.read_bytes()
    toc = run(['exec', '-i', container, 'pg_restore', '--list'], data=data)
    (dest / (stem + '-toc.txt')).write_bytes(toc)
    restored_db = 'recovery_restore_' + datetime.datetime.now().strftime('%Y%m%d_%H%M%S') + '_' + uuid.uuid4().hex[:10]
    # Fresh random name and template0. Never --clean, dropdb, schema reset, or an existing target.
    if run([*base, "SELECT count(*) FROM pg_database WHERE datname='" + restored_db + "'"]).decode().strip() != '0':
        raise RuntimeError('Target database already exists; refusing overwrite')
    run(['exec', container, 'createdb', '-U', user, '-T', 'template0', '--', restored_db])
    result['restoredDatabase'] = restored_db
    run(['exec', '-i', container, 'pg_restore', '-U', user, '-d', restored_db,
         '--no-owner', '--no-privileges', '--exit-on-error', '--single-transaction'], data=data, timeout=300)
    restored = Session(container, user, restored_db, dest / (stem + '-restore-psql.log'))
    try:
        restored.start()
        after = fingerprint(restored)
    finally:
        restored.close()
    result.update({'restored': after, **compare_snapshots(before, after)})
    if not result['matchesSnapshot'] or not result['foreignKeysValid']:
        result['status'] = 'failed_validation'
        raise RuntimeError('Restoration differs from source snapshot; evidence preserved, no retry/overwrite')
    result['status'] = 'restored_and_verified'
    (dest / 'resultado.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'database': database, 'restoredDatabase': restored_db,
                      'status': result['status'], 'backup': str(archive)}))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source-container', required=True)
    p.add_argument('--user', default='demo')
    p.add_argument('--database', action='append')
    p.add_argument('--all-user-databases', action='store_true')
    p.add_argument('--expected-system-id', default=EXPECTED_SYSTEM_ID)
    p.add_argument('--execute', action='store_true', help='Dump and restore into newly created databases; otherwise inspect only')
    args = p.parse_args()
    container_name(args.source_container)
    database_name(args.user)
    for database in args.database or []:
        database_name(database)
    if not DOCKER.is_file():
        raise RuntimeError('Verified Docker Desktop client path unavailable')
    # Authenticode check without changing execution policy, permissions or exclusions.
    ps = ['powershell.exe', '-NoProfile', '-Command',
          "(Get-AuthenticodeSignature -LiteralPath '" + str(DOCKER).replace("'", "''") + "').Status.ToString()"]
    signature = subprocess.run(ps, capture_output=True, timeout=30, check=True).stdout.decode().strip()
    if signature != 'Valid':
        raise RuntimeError('Docker client signature not valid')
    info = json.loads(run(['inspect', args.source_container]))[0]
    if not info['State']['Running']:
        raise RuntimeError('Source container is not running; this script never starts it')
    official = official_postgres_image(info['Image'])
    base = ['exec', args.source_container, 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
            '-U', args.user, '-d', 'postgres', '-c']
    identity = run([*base, 'SELECT system_identifier::text FROM pg_control_system()']).decode().strip()
    if identity != args.expected_system_id:
        raise RuntimeError('Unexpected PostgreSQL system identifier; no backup/restore performed')
    if run([*base, 'SELECT rolsuper FROM pg_roles WHERE rolname=current_user']).decode().strip() != 't':
        raise RuntimeError('Source role is not superuser; full row visibility cannot be guaranteed')
    databases = run([*base, "SELECT datname FROM pg_database WHERE datallowconn AND NOT datistemplate ORDER BY datname"]).decode().splitlines()
    meta = {'sourceContainer': args.source_container, 'systemIdentifier': identity,
            'image': official, 'mounts': info['Mounts'], 'databases': databases,
            'postgresVersion': run([*base, 'SELECT version()']).decode().strip(),
            'pgDumpVersion': run(['exec', args.source_container, 'pg_dump', '--version']).decode().strip(),
            'pgRestoreVersion': run(['exec', args.source_container, 'pg_restore', '--version']).decode().strip(),
            'psqlVersion': run(['exec', args.source_container, 'psql', '--version']).decode().strip()}
    print(json.dumps(meta, ensure_ascii=False, indent=2))
    if not args.execute:
        return
    selected = databases if args.all_user_databases else (args.database or ['trazabilidad'])
    for database in selected:
        database_name(database)
    if any(v not in databases for v in selected):
        raise RuntimeError('Database does not exist; no source databases are created')
    dest = ROOT / ('datos-logicos_' + datetime.datetime.now().strftime('%Y%m%d_%H%M%S') + '_' + uuid.uuid4().hex[:6])
    dest.mkdir(parents=True, exist_ok=False)
    report = {**meta, 'output': str(dest), 'results': [],
              'limitations': 'Restore uses --no-owner/--no-privileges: owner/ACL equivalence is not asserted. No restore is a project migration.'}
    (dest / 'PRIVADO.txt').write_text('Private logical database backups. Do not upload or commit. May contain sessions and password hashes.\n')
    try:
        for number, database in enumerate(selected):
            backup_database(args.source_container, args.user, number, database, dest, report, base)
    except Exception as e:
        report['error'] = str(e)
        raise
    finally:
        (dest / 'resultado.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
