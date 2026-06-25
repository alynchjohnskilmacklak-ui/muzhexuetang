#!/usr/bin/env bash
# check-prisma-usage.sh — CI guard: reject $queryRawUnsafe in application code.
# Allows $queryRawUnsafe only in migration/seed/scripts; blocks it in src/.
set -euo pipefail

VIOLATIONS=0
SEARCH_DIR="${1:-src}"

while IFS= read -r line; do
  echo "VIOLATION: $line"
  VIOLATIONS=$((VIOLATIONS + 1))
done < <(grep -rn '\$queryRawUnsafe' "$SEARCH_DIR" --include='*.ts' --include='*.tsx' 2>/dev/null || true)

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "ERROR: Found $VIOLATIONS \$queryRawUnsafe call(s) in $SEARCH_DIR/."
  echo "Use tagged-template \$queryRaw\`...\` instead to prevent SQL injection."
  exit 1
fi

echo "OK: No \$queryRawUnsafe in $SEARCH_DIR/ ($VIOLATIONS violations)"
