#!/bin/bash

# AURORA PIPELINE - CLIENT FIXES VERIFICATION SCRIPT
# Tests the three critical fixes implemented

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║  AURORA PIPELINE - CLIENT FIXES VERIFICATION           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

echo "════════════════════════════════════════════════════════"
echo "TEST #1: STARTUP CONFIG HARD-FAIL"
echo "════════════════════════════════════════════════════════"
echo ""

info "Testing service startup without OPENAI_API_KEY..."

# Backup current env
BACKUP_OPENAI_KEY="${OPENAI_API_KEY}"

# Remove OPENAI_API_KEY
unset OPENAI_API_KEY

# Try to start service (should fail)
if npm run dev 2>&1 | grep -q "FATAL.*Missing required"; then
    pass "Service refused to start without OPENAI_API_KEY"
else
    fail "Service should have refused to start without OPENAI_API_KEY"
fi

# Restore env
export OPENAI_API_KEY="${BACKUP_OPENAI_KEY}"

echo ""
info "Testing service startup with empty OPENAI_API_KEY..."

# Set empty value
export OPENAI_API_KEY=""

# Try to start service (should fail)
if timeout 5s npm run dev 2>&1 | grep -q "FATAL.*Missing required"; then
    pass "Service refused to start with empty OPENAI_API_KEY"
else
    fail "Service should have refused to start with empty OPENAI_API_KEY"
fi

# Restore env
export OPENAI_API_KEY="${BACKUP_OPENAI_KEY}"

echo ""
info "Testing service startup with DATABASE_URL missing..."

# Backup and remove DATABASE_URL
BACKUP_DB_URL="${DATABASE_URL}"
unset DATABASE_URL

# Try to start service (should fail)
if timeout 5s npm run dev 2>&1 | grep -q "FATAL.*Missing required"; then
    pass "Service refused to start without DATABASE_URL"
else
    fail "Service should have refused to start without DATABASE_URL"
fi

# Restore env
export DATABASE_URL="${BACKUP_DB_URL}"

echo ""
echo "════════════════════════════════════════════════════════"
echo "TEST #2: DLQ PERSISTENCE"
echo "════════════════════════════════════════════════════════"
echo ""

info "Checking DLQ table schema..."

# Check if payloadHash column exists
if psql "${DATABASE_URL}" -c "\d dlq" 2>/dev/null | grep -q "payload_hash"; then
    pass "DLQ table has payload_hash column"
else
    fail "DLQ table missing payload_hash column (run: npm run db:push)"
fi

info "Checking for DLQ entries after forced failure..."

# Query DLQ table
DLQ_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM dlq;" 2>/dev/null || echo "0")

if [ "${DLQ_COUNT}" -gt 0 ]; then
    pass "DLQ table contains ${DLQ_COUNT} entries"
    
    # Check required fields
    info "Verifying required DLQ fields..."
    
    psql "${DATABASE_URL}" -c "SELECT id, run_id, operation, error, payload_hash, created_at FROM dlq LIMIT 1;" 2>/dev/null || fail "Could not query DLQ fields"
    
else
    info "No DLQ entries found yet (trigger a failed run to test)"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "TEST #3: DLQ RE-ENQUEUE GUARD"
echo "════════════════════════════════════════════════════════"
echo ""

info "This test requires manual verification:"
echo "  1. Create a failed job (will be added to DLQ)"
echo "  2. Attempt to trigger the same job again"
echo "  3. Check logs for 'DLQ_BLOCKED' message"
echo "  4. Verify only ONE entry exists in DLQ for that run_id + operation"

echo ""
echo "Manual verification SQL:"
echo "  SELECT run_id, operation, COUNT(*) as count"
echo "  FROM dlq"
echo "  GROUP BY run_id, operation"
echo "  HAVING COUNT(*) > 1;"
echo ""
echo "  ^ Should return 0 rows (no duplicates)"

echo ""
echo "════════════════════════════════════════════════════════"
echo "SUMMARY"
echo "════════════════════════════════════════════════════════"
echo ""

echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"

if [ ${TESTS_FAILED} -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All automated tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run database migration: npm run db:push"
    echo "  2. Test DLQ persistence with a forced failure"
    echo "  3. Verify DLQ re-enqueue guard manually"
    echo "  4. Deploy to production"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some tests failed. Please review.${NC}"
    exit 1
fi
