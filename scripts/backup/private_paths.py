"""Resolve only regular private artifact files under this repository's .local."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def private_path(value, *, existing=True, suffix='.json'):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9_./-]+', value):
        raise ValueError('Use a repository-relative private artifact path')
    relative = Path(value)
    if (relative.is_absolute() or '..' in relative.parts or len(relative.parts) < 2
            or relative.parts[0] != '.local' or relative.suffix != suffix):
        raise ValueError('Artifact must stay below .local with the expected extension')
    candidate = ROOT
    for part in relative.parts:
        candidate = candidate / part
        if candidate.is_symlink() or candidate.is_junction():
            raise ValueError('Linked private artifact paths are not allowed')
    resolved = candidate.resolve()
    if (ROOT / '.local').resolve() not in resolved.parents:
        raise ValueError('Private artifact escaped its root')
    if existing and not resolved.is_file():
        raise ValueError('Private artifact is not a regular file')
    if not existing and (resolved.exists() or not resolved.parent.is_dir()):
        raise ValueError('Output must be a new file in an existing private directory')
    return resolved
