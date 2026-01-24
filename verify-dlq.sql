-- AURORA PIPELINE - DLQ VERIFICATION QUERIES
-- Run these queries to verify DLQ functionality

-- ============================================================
-- 1. CHECK DLQ TABLE SCHEMA
-- ============================================================
-- Should show columns including: payload_hash
\d dlq;

-- ============================================================
-- 2. VIEW ALL DLQ ENTRIES
-- ============================================================
SELECT 
    id,
    run_id,
    operation,
    status,
    error,
    payload_hash,
    retry_count,
    max_retries,
    created_at,
    updated_at
FROM dlq
ORDER BY created_at DESC;

-- ============================================================
-- 3. CHECK FOR DUPLICATE ENTRIES (Should return 0 rows)
-- ============================================================
SELECT 
    run_id,
    operation,
    COUNT(*) as duplicate_count
FROM dlq
GROUP BY run_id, operation
HAVING COUNT(*) > 1;

-- ============================================================
-- 4. DLQ STATISTICS BY OPERATION
-- ============================================================
SELECT 
    operation,
    status,
    COUNT(*) as count,
    AVG(retry_count) as avg_retries
FROM dlq
GROUP BY operation, status
ORDER BY operation, status;

-- ============================================================
-- 5. RECENT FAILURES (Last 24 hours)
-- ============================================================
SELECT 
    run_id,
    operation,
    error,
    created_at
FROM dlq
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- ============================================================
-- 6. PENDING RETRIES
-- ============================================================
SELECT 
    id,
    run_id,
    operation,
    retry_count,
    max_retries,
    error,
    created_at
FROM dlq
WHERE status = 'pending' 
  AND retry_count < max_retries
ORDER BY created_at;

-- ============================================================
-- 7. EXHAUSTED RETRIES (Terminal Failures)
-- ============================================================
SELECT 
    id,
    run_id,
    operation,
    error,
    retry_count,
    created_at
FROM dlq
WHERE status = 'failed' 
   OR retry_count >= max_retries
ORDER BY created_at DESC;

-- ============================================================
-- 8. VERIFY PAYLOAD HASH UNIQUENESS
-- ============================================================
SELECT 
    payload_hash,
    COUNT(*) as occurrences
FROM dlq
WHERE payload_hash IS NOT NULL
GROUP BY payload_hash
HAVING COUNT(*) > 1;

-- ============================================================
-- 9. JOIN WITH RUNS TABLE (See full context)
-- ============================================================
SELECT 
    r.id as run_id,
    r.status as run_status,
    r.started_at,
    r.completed_at,
    d.operation as failed_operation,
    d.error,
    d.created_at as dlq_entry_created
FROM runs r
LEFT JOIN dlq d ON d.run_id = r.id
WHERE r.status = 'failed'
ORDER BY r.started_at DESC;

-- ============================================================
-- 10. CLEANUP OLD RESOLVED ENTRIES (Optional)
-- ============================================================
-- Uncomment to delete resolved entries older than 30 days
-- DELETE FROM dlq 
-- WHERE status = 'resolved' 
--   AND created_at < NOW() - INTERVAL '30 days';
