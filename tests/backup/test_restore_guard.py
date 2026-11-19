import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/backup'))
import restore_docker
from test_snapshot_compare import snapshot
from snapshot_compare import RESTORED_CHECK


class RestoreGuard(unittest.TestCase):
    def exercise(self, restored):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            docker = root / 'docker.exe'
            docker.write_bytes(b'not executed')
            def run(args, *, data=None, stdout=None, timeout=120):
                if stdout is not None:
                    stdout.write(b'synthetic archive, not a database backup')
                    return None
                if args[0] == 'inspect':
                    return json.dumps([{'State': {'Running': True}, 'Image': 'fixture', 'Mounts': []}]).encode()
                sql = args[-1]
                if 'system_identifier' in sql:
                    return b'7707318725026357291'
                if 'rolsuper' in sql:
                    return b't'
                if 'datallowconn' in sql:
                    return b'fixture'
                if 'count(*) FROM pg_database' in sql:
                    return b'0'
                return b'synthetic tool output'
            with patch.object(restore_docker, 'ROOT', root), \
                 patch.object(restore_docker, 'DOCKER', docker), \
                 patch.object(restore_docker, 'run', side_effect=run), \
                 patch.object(restore_docker, 'official_postgres_image', return_value={'testDouble': True}), \
                 patch.object(restore_docker.subprocess, 'run', return_value=MagicMock(stdout=b'Valid')), \
                 patch.object(restore_docker, 'Session') as session, \
                 patch.object(restore_docker, 'fingerprint', side_effect=[snapshot(), restored]), \
                 patch('builtins.print'), \
                 patch.object(sys, 'argv', ['restore_docker.py', '--source-container', 'test', '--database', 'fixture', '--execute']):
                session.return_value.sql.return_value = ['A-B-1']
                error = None
                try:
                    restore_docker.main()
                except RuntimeError as exc:
                    error = exc
                report = json.loads(next(root.glob('datos-logicos_*/resultado.json')).read_text())
                return error, report

    def test_actual_helper_stops_and_preserves_failed_report(self):
        error, report = self.exercise(snapshot('CHECK (true)'))
        self.assertIsNotNone(error)
        self.assertEqual(report['results'][0]['status'], 'failed_validation')
        self.assertFalse(report['results'][0]['matchesSnapshot'])
        self.assertIn('error', report)

    def test_actual_helper_records_raw_and_limited_semantic_comparison(self):
        error, report = self.exercise(snapshot(RESTORED_CHECK))
        self.assertIsNone(error)
        result = report['results'][0]
        self.assertEqual(result['status'], 'restored_and_verified')
        self.assertFalse(result['rawMatchesSnapshot'])
        self.assertTrue(result['matchesSnapshot'])
        self.assertEqual(len(result['representationDifferences']), 1)

    def test_image_without_official_digest_is_not_reported_as_verified(self):
        with patch.object(restore_docker, 'run', return_value=b'[{"RepoDigests":[]}]'):
            with self.assertRaisesRegex(RuntimeError, 'No official postgres repository digest'):
                restore_docker.official_postgres_image('unverified')


if __name__ == '__main__':
    unittest.main()
