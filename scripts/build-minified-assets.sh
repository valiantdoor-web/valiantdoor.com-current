#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

npx --yes clean-css-cli -O2 -o public/css/styles.min.css src/css/styles.css
npx --yes terser src/js/main.js -c -m -o public/js/main.min.js

echo "Minified assets written to:"
echo "  public/css/styles.min.css"
echo "  public/js/main.min.js"
