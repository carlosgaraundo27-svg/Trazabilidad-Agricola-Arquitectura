import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts' / 'backup'))
from snapshot_compare import compare_snapshots, require_verified, ORIGINAL_CHECK, RESTORED_CHECK


def snapshot(definition=ORIGINAL_CHECK):
    return {'tables': [{'schema': 'intake', 'table': 'receipt_temperatures', 'rows': 1, 'sha256Rows': 'abc'}],
            'migrations': ['001', '002', '003', '004', '005', '006', '007'],
            'foreignKeyOrphans': [{'constraint': 'example_fk', 'orphans': 0}],
            'constraints': [{'schema': 'intake', 'table': 'receipt_temperatures',
                             'name': 'receipt_temperatures_value_c_check', 'type': 'c',
                             'validated': True, 'definition': definition}]}


class SnapshotComparison(unittest.TestCase):
    def test_shared_fixture_and_unicode_metadata_are_strict(self):
        fixture = json.loads((ROOT / 'scripts/backup/temperature-check.json').read_text(encoding='utf-8'))
        self.assertEqual(fixture['original'], ORIGINAL_CHECK)
        self.assertEqual(fixture['restored'], RESTORED_CHECK)
        a, b = snapshot(), snapshot(RESTORED_CHECK)
        for item in (a, b):
            item['constraints'].append({'schema': 'intake', 'table': 'receipt_temperatures',
                                        'name': 'receipt_temperatures_unit_check', 'type': 'c',
                                        'validated': True, 'definition': "CHECK ((unit = '°C'::text))"})
        a['constraints'][1]['definition'] = "CHECK ((unit = '\ufffdC'::text))"
        with self.assertRaises(ValueError):
            require_verified(a, b)

    def test_exact_match_and_known_grouping_both_directions_without_mutation(self):
        a, b = snapshot(), snapshot(RESTORED_CHECK)
        saved = copy.deepcopy((a, b))
        self.assertTrue(compare_snapshots(a, a)['rawMatchesSnapshot'])
        for left, right in [(a, b), (b, a)]:
            comparison = require_verified(left, right)
            self.assertFalse(comparison['rawMatchesSnapshot'])
            self.assertTrue(comparison['matchesSnapshot'])
            self.assertEqual(len(comparison['representationDifferences']), 1)
        self.assertEqual(saved, (a, b))

    def test_real_changes_and_unknown_forms_fail_closed(self):
        for replacement in [RESTORED_CHECK.replace('<= 2', '<= 3'),
                            RESTORED_CHECK.replace('<= 999999.99', '< 999999.99'),
                            RESTORED_CHECK.replace('AND', 'OR', 1),
                            RESTORED_CHECK.replace('-999999.99', '-999999.98'),
                            RESTORED_CHECK + ' NOT VALID', 'CHECK (true)']:
            a, b = snapshot(), snapshot(replacement)
            with self.subTest(replacement=replacement), self.assertRaises(ValueError):
                require_verified(a, b)

    def test_identity_metadata_rows_foreign_keys_and_migrations_stay_strict(self):
        for section, field, value in [('constraints', 'name', 'other_check'),
                                      ('constraints', 'schema', 'other_schema'),
                                      ('constraints', 'table', 'other_table'),
                                      ('constraints', 'type', 'f'),
                                      ('constraints', 'validated', False),
                                      ('tables', 'rows', 2), ('tables', 'sha256Rows', 'changed'),
                                      ('foreignKeyOrphans', 'orphans', 1)]:
            b = snapshot(RESTORED_CHECK)
            b[section][0][field] = value
            a = snapshot()
            with self.subTest(field=field), self.assertRaises(ValueError):
                require_verified(a, b)
        b = snapshot(RESTORED_CHECK)
        b['migrations'].append('008')
        a = snapshot()
        with self.assertRaises(ValueError):
            require_verified(a, b)
        for section in ['constraints', 'tables', 'migrations', 'foreignKeyOrphans']:
            b = snapshot()
            del b[section]
            a = snapshot()
            with self.assertRaises(ValueError):
                require_verified(a, b)
        b = snapshot()
        b['foreignKeyOrphans'][0]['orphans'] = 1
        with self.assertRaises(ValueError):
            require_verified(b, b)

    def test_same_spelling_on_another_check_is_not_allowlisted(self):
        a, b = snapshot(), snapshot(RESTORED_CHECK)
        for s in (a, b):
            s['constraints'][0]['name'] = 'unrelated'
        with self.assertRaises(ValueError):
            require_verified(a, b)

    def test_cli_real_difference_exits_nonzero_and_preserves_inputs(self):
        (ROOT / '.local').mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT / '.local') as tmp:
            left, right = Path(tmp) / 'left.json', Path(tmp) / 'right.json'
            left.write_text(json.dumps(snapshot()), encoding='utf-8')
            right.write_text(json.dumps(snapshot('CHECK (true)')), encoding='utf-8')
            before = (left.read_bytes(), right.read_bytes())
            r = subprocess.run([sys.executable, str(ROOT / 'scripts/backup/snapshot_compare.py'),
                                left.relative_to(ROOT).as_posix(), right.relative_to(ROOT).as_posix()], capture_output=True)
            self.assertNotEqual(r.returncode, 0)
            self.assertEqual(before, (left.read_bytes(), right.read_bytes()))
            right.write_text(json.dumps(snapshot(RESTORED_CHECK)), encoding='utf-8')
            r = subprocess.run([sys.executable, str(ROOT / 'scripts/backup/snapshot_compare.py'),
                                left.relative_to(ROOT).as_posix(), right.relative_to(ROOT).as_posix()], capture_output=True)
            self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == '__main__':
    unittest.main()
