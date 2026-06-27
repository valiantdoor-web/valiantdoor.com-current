#!/usr/bin/env bash
set -euo pipefail
SOURCE_PATH="${1:-/tmp/codex-remote-attachments/019d3278-ac8b-72a3-8ef3-ac20dc269da7/AB37D6DB-279A-40F3-9EB1-402E7AF2C4CD/1-Valiant_API_Apple.pem}"
TARGET_DIR="${HOME}/.config/valiantdoor/apple-business"
TARGET_PATH="${TARGET_DIR}/Valiant_API_Apple.pem"

if [[ ! -f "${SOURCE_PATH}" ]]; then
  echo "Missing Apple key file: ${SOURCE_PATH}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"
cp "${SOURCE_PATH}" "${TARGET_PATH}"
chmod 600 "${TARGET_PATH}"
printf '%s\n' "${TARGET_PATH}"
