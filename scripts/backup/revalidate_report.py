"""Revalidate an existing restored DB/dump; never writes to either database/report."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess

from restore_docker import fingerprint, Session
from snapshot_compare import compare_snapshots, ORIGINAL_CHECK, RESTORED_CHECK
from private_paths import private_path

ROOT = Path(__file__).resolve().parents[2]


class ReadOnlySession:
    def __init__(self, source=False):
        env = {**os.environ, 'BACKUP_SOURCE_READ_ONLY': 'yes' if source else 'no'}
        if source:
            env['BACKUP_VERIFICATION_URL'] = os.environ['BACKUP_SOURCE_URL']
        self.process = subprocess.Popen([os.environ['BACKUP_NODE'], str(ROOT / 'scripts/backup/pg-session.js')],
                                        stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True,
                                        encoding='utf-8', env=env)
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError('Read-only PostgreSQL connection failed')
        self.metadata = json.loads(line)['ready']

    def sql(self, query):
        self.process.stdin.write(json.dumps(query) + '\n')
        self.process.stdin.flush()
        response = json.loads(self.process.stdout.readline())
        if 'error' in response:
            raise RuntimeError('Read-only query failed: ' + response['error'])
        return response['rows']

    def close(self):
        self.process.stdin.close()
        if self.process.wait(timeout=15) != 0:
            raise RuntimeError('Read-only bridge failed')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', required=True)
    parser.add_argument('--proof', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    report_path = private_path(args.report)
    proof_path = private_path(args.proof)
    output_path = private_path(args.output, existing=False)
    proof = json.loads(proof_path.read_text(encoding='utf-8-sig'))
    if (proof['status'] != 'isolated_check_verified' or len(proof['outcomes']) != 80
            or proof['truthTable'] != {'equivalent': True, 'cases': 27}
            or proof['changedConstraintDetected'] is not True
            or proof['definitions']['original'] != ORIGINAL_CHECK
            or proof['definitions']['restored'] != RESTORED_CHECK):
        raise ValueError('Missing isolated PostgreSQL evidence for the exact definitions')
    original_bytes = report_path.read_bytes()
    report = json.loads(original_bytes.decode('utf-8-sig'))
    if len(report['results']) != 1:
        raise ValueError('Select a single-database report')
    previous = report['results'][0]
    expected_database = previous['restoredDatabase']
    from urllib.parse import urlparse
    if urlparse(os.environ['BACKUP_VERIFICATION_URL']).path != '/' + expected_database:
        raise ValueError('Connection must target exactly the previously restored database')
    dump_name = previous['dump']
    import re
    if not re.fullmatch(r'[0-9]+_[a-f0-9]{12}\.dump', dump_name):
        raise ValueError('Invalid archive path')
    dump = private_path((report_path.parent / dump_name).relative_to(ROOT).as_posix(), suffix='.dump')
    if (hashlib.sha256(dump.read_bytes()).hexdigest() != previous['sha256']
            or dump.stat().st_size != previous['bytes']):
        raise ValueError('Archive integrity differs from the preserved report')
    # Re-read metadata instead of accepting the old report's replacement character.
    source_session = ReadOnlySession(source=True)
    try:
        Session.start(source_session)
        current_source = fingerprint(source_session)
        source_session.sql('ROLLBACK;')
        for section in ('tables', 'migrations', 'foreignKeyOrphans'):
            if current_source[section] != previous['source'][section]:
                raise ValueError('Source data changed since the preserved archive: ' + section)
        source_metadata = source_session.metadata
    finally:
        source_session.close()
    session = ReadOnlySession()
    try:
        Session.start(session)
        live = fingerprint(session)
        comparison = compare_snapshots(current_source, live)
        session.sql('ROLLBACK;')
        verified = comparison['matchesSnapshot'] and comparison['foreignKeysValid']
        result = {'status': 'restored_snapshot_verified' if verified else 'failed_validation',
                  'sourceReportSha256': hashlib.sha256(original_bytes).hexdigest(),
                  'dumpSha256': previous['sha256'], 'bytes': previous['bytes'],
                  'database': previous['database'], 'restoredDatabase': expected_database,
                  'comparison': comparison, 'migrations': live['migrations'],
                  'metadata': session.metadata, 'sourceMetadata': source_metadata,
                  'isolatedProofSha256': hashlib.sha256(proof_path.read_bytes()).hexdigest(),
                  'originalPgDumpVersion': report.get('pgDumpVersion'),
                  'originalPgRestoreVersion': report.get('pgRestoreVersion', 'not recorded'),
                  'source': current_source, 'restored': live,
                  'legacySourceDataMatches': True,
                  'legacyMetadataTrusted': False,
                  'limitations': 'Existing restoration independently revalidated with live read-only snapshots; not a new backup. Old report has U+FFFD in unit CHECK metadata. Owners/ACL not verified. Previous image provenance claim is not trusted (local placeholder).'}
        with output_path.open('x', encoding='utf-8') as output:
            json.dump(result, output, ensure_ascii=False, indent=2)
        print(json.dumps({k: result[k] for k in ('status', 'restoredDatabase', 'comparison', 'migrations')}))
        if not verified:
            raise ValueError('Live restoration differs; new failed evidence preserved')
    finally:
        session.close()


if __name__ == '__main__':
    main()
