#!/usr/bin/env bash
# Compatibility wrapper. The real deploy implementation lives in scripts/deploy-from-tar.sh.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$SCRIPT_DIR/scripts/deploy-from-tar.sh" "$@"
