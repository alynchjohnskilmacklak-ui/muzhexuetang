#!/usr/bin/env bash
# Guard: ensure no bare `prisma` import in division-scoped routes.
# Bare prisma = import { prisma } without getRequestPrisma/getPrismaForDivision.
# Any hit in parent/, teacher/, api/parent/, api/teacher/ MUST use getRequestPrisma.
set -eu

cd "$(dirname "$0")/.."

VIOLATIONS=0
RED='\033[0;31m'
NC='\033[0m'

check_dir() {
  local dir="$1"
  local label="$2"
  while IFS= read -r file; do
    # Check: file imports from @/lib/prisma but does NOT import getRequestPrisma / getPrismaForDivision / isDualDbEnabled
    if grep -q "from '@/lib/prisma'" "$file" 2>/dev/null; then
      if ! grep -qE "getRequestPrisma|getPrismaForDivision|isDualDbEnabled" "$file" 2>/dev/null; then
        echo -e "${RED}[VIOLATION]${NC} $file — imports bare prisma without getRequestPrisma / getPrismaForDivision"
        VIOLATIONS=$((VIOLATIONS + 1))
      fi
    fi
  done < <(find "$dir" -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null || true)
}

check_dir "src/app/parent" "parent pages"
check_dir "src/app/teacher" "teacher pages"
check_dir "src/app/api/parent" "parent API routes"
check_dir "src/app/api/teacher" "teacher API routes"

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo -e "${RED}[FAIL]${NC} $VIOLATIONS file(s) with bare prisma import detected."
  echo "All division-scoped routes must use getRequestPrisma() or getPrismaForDivision()."
  exit 1
fi

echo "[OK] No bare prisma imports in division-scoped routes."
