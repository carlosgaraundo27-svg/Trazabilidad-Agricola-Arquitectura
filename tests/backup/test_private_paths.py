from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/backup'))
from private_paths import private_path


class PrivatePaths(unittest.TestCase):
    def test_paths_cannot_escape_private_root(self):
        for value in ['../outside.json', '.local/../outside.json', '/etc/passwd',
                      'C:\\Users\\private.json', '.git/config', '.local', '.local/x.txt']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                private_path(value)

    def test_regular_files_only_and_no_symlinks(self):
        (ROOT / '.local').mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT / '.local') as tmp:
            folder = Path(tmp)
            good = folder / 'report.json'
            good.write_text('{}')
            relative = good.relative_to(ROOT).as_posix()
            self.assertEqual(private_path(relative), good.resolve())
            link = folder / 'link.json'
            try:
                link.symlink_to(good)
            except OSError:
                return  # Windows may disallow symlink creation; escape cases still run.
            with self.assertRaises(ValueError):
                private_path(link.relative_to(ROOT).as_posix())


if __name__ == '__main__':
    unittest.main()
