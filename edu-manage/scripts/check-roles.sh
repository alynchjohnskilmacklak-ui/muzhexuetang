#!/usr/bin/env bash
# Guard: ensure no uppercase role names in requireRole() calls.
# Login layer only uses lowercase admin/teacher/parent, so uppercase
# ADMIN/TEACHER/PARENT/SUPER_ADMIN in requireRole() causes 403.
set -eu

cd "$(dirname "$0")/.."

RED='\033[0;31m'
NC='\033[0m'
VIOLATIONS=0

while IFS= read -r hit; do
  echo -e "${RED}[VIOLATION]${NC} $hit"
  VIOLATIONS=$((VIOLATIONS + 1))
done < <(grep -rnE "requireRole\(\[[^]]*(?:ADMIN|TEACHER|PARENT|SUPER_ADMIN)" src/app 2>/dev/null || true)

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo -e "${RED}[FAIL]${NC} $VIOLATIONS requireRole call(s) with uppercase role detected."
  echo "Use lowercase: admin, teacher, parent. For super-admin, use requireSuperAdmin()."
  exit 1
fi

echo "[OK] No uppercase roles in requireRole() calls."
