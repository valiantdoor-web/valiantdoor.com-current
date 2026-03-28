#!/usr/bin/env python3
from __future__ import annotations

import shutil
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'public' / 'assets'


def main() -> int:
    created = 0
    for src in ASSETS.rglob('*'):
        if not src.is_file() or '%' not in src.name:
            continue
        decoded_name = urllib.parse.unquote(src.name)
        if decoded_name == src.name:
            continue
        dst = src.with_name(decoded_name)
        if dst.exists():
            continue
        shutil.copy2(src, dst)
        created += 1
        print(f'created alias: {dst.relative_to(ROOT)}')

    if created == 0:
        print('No new decoded asset aliases were needed.')
    else:
        print(f'Created {created} decoded asset aliases.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
