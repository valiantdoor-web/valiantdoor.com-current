#!/usr/bin/env python3
from __future__ import annotations

import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE_ROOT = ROOT / 'amazon' / 'alexa-valiant' / 'skill-package'
OUT = ROOT / 'amazon' / 'alexa-valiant' / 'dist' / 'valiant-alexa-skill-package.zip'


def main() -> int:
    if not PACKAGE_ROOT.exists():
        print(f'Missing package root: {PACKAGE_ROOT}')
        return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        OUT.unlink()
    with zipfile.ZipFile(OUT, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(PACKAGE_ROOT.rglob('*')):
            if path.is_file():
                zf.write(path, path.relative_to(PACKAGE_ROOT).as_posix())
    print(f'Wrote {OUT.relative_to(ROOT)}')
    with zipfile.ZipFile(OUT) as zf:
        for name in zf.namelist():
            print(f'- {name}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
