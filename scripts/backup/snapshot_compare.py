"""Fail-closed snapshot comparison; no SQL execution or data mutation."""
import argparse
import copy
import json
from pathlib import Path

ORIGINAL_CHECK = "CHECK ((((value_c >= '-999999.99'::numeric) AND (value_c <= 999999.99)) AND (scale(value_c) <= 2)))"
RESTORED_CHECK = "CHECK (((value_c >= '-999999.99'::numeric) AND (value_c <= 999999.99) AND (scale(value_c) <= 2)))"
IDENTITY = ('intake', 'receipt_temperatures', 'receipt_temperatures_value_c_check')
SECTIONS = {'tables', 'migrations', 'constraints', 'foreignKeyOrphans'}


def compare_snapshots(source, restored):
    for snapshot in (source, restored):
        if not isinstance(snapshot, dict) or not SECTIONS.issubset(snapshot):
            raise ValueError('Incomplete snapshot')
        if any(not isinstance(snapshot[key], list) for key in SECTIONS):
            raise ValueError('Invalid snapshot section')
    left, right = copy.deepcopy(source), copy.deepcopy(restored)
    differences = []
    # Exact allowlist, not SQL text normalization. Every other byte/field remains strict.
    for index, (a, b) in enumerate(zip(left['constraints'], right['constraints'])):
        identity = tuple(a.get(k) for k in ('schema', 'table', 'name'))
        if (identity == IDENTITY and a.get('type') == b.get('type') == 'c'
                and a.get('validated') is True and b.get('validated') is True
                and {k: v for k, v in a.items() if k != 'definition'}
                == {k: v for k, v in b.items() if k != 'definition'}
                and a.get('definition') in (ORIGINAL_CHECK, RESTORED_CHECK)
                and b.get('definition') in (ORIGINAL_CHECK, RESTORED_CHECK)
                and a['definition'] != b['definition']):
            differences.append({'path': f'constraints[{index}].definition',
                                'identity': list(IDENTITY), 'source': a['definition'],
                                'restored': b['definition'], 'rule': 'temperature-and-grouping-v1'})
            a['definition'] = b['definition'] = RESTORED_CHECK
    return {'rawMatchesSnapshot': source == restored, 'matchesSnapshot': left == right,
            'foreignKeysValid': all(v.get('orphans') == 0 for v in restored['foreignKeyOrphans']),
            'representationDifferences': differences}


def require_verified(source, restored):
    comparison = compare_snapshots(source, restored)
    if not comparison['matchesSnapshot'] or not comparison['foreignKeysValid']:
        raise ValueError('Restoration differs from source snapshot or has FK orphans')
    return comparison


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('restored', type=Path)
    args = parser.parse_args()
    result = require_verified(json.loads(args.source.read_text(encoding='utf-8-sig')),
                              json.loads(args.restored.read_text(encoding='utf-8-sig')))
    print(json.dumps(result))


if __name__ == '__main__':
    main()
