-- ==================================================
-- FINANCE V20 LIVE TEST
-- ==================================================
-- Tikslas: Patikrinti invoices struktūrą ir view'us
-- Paleisti: Supabase SQL Editor
-- ==================================================

-- =============================================
-- 1. INVOICES LENTELĖS STRUKTŪRA
-- =============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
ORDER BY ordinal_position;

-- =============================================
-- 2. AR INVOICES TURI METADATA STULPELĮ?
-- =============================================
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'metadata'
    ) THEN 'YES - metadata EXISTS'
    ELSE 'NO - metadata MISSING (CRITICAL!)'
  END AS invoices_metadata_status;

-- =============================================
-- 3. ESAMI FINANCE VIEW'AI
-- =============================================
SELECT 
  table_name AS view_name,
  'VIEW' AS object_type
FROM information_schema.views
WHERE table_schema = 'public'
  AND (
    table_name LIKE 'project_finance%'
    OR table_name LIKE 'membership_fee%'
    OR table_name LIKE 'legacy_budget%'
  )
ORDER BY table_name;

-- =============================================
-- 4. ESAMOS FINANCE FUNKCIJOS
-- =============================================
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND (
    proname LIKE '%invoice%'
    OR proname LIKE '%finance%'
    OR proname LIKE 'validate_metadata%'
  )
ORDER BY proname;

-- =============================================
-- 5. ESAMI TRIGGERIAI ANT INVOICES
-- =============================================
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'invoices';

-- =============================================
-- 6. RESOLUTIONS SU PROJECT METADATA
-- =============================================
SELECT 
  COUNT(*) AS total_resolutions,
  COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved_count,
  COUNT(*) FILTER (WHERE metadata ? 'project.tag' OR metadata ? 'project.phase') AS with_project_metadata
FROM resolutions;

-- =============================================
-- 7. INVOICES DUOMENŲ APŽVALGA
-- =============================================
SELECT 
  COUNT(*) AS total_invoices,
  COUNT(DISTINCT org_id) AS orgs_with_invoices,
  COUNT(DISTINCT membership_id) AS members_with_invoices
FROM invoices;

-- =============================================
-- 8. VIEW TESTAVIMAS (jei egzistuoja)
-- =============================================
DO $$
BEGIN
  -- Test project_finance_view
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'project_finance_view') THEN
    RAISE NOTICE 'project_finance_view EXISTS - testing...';
    PERFORM * FROM project_finance_view LIMIT 1;
    RAISE NOTICE 'project_finance_view OK';
  ELSE
    RAISE NOTICE 'project_finance_view NOT FOUND';
  END IF;

  -- Test membership_fee_view
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'membership_fee_view') THEN
    RAISE NOTICE 'membership_fee_view EXISTS - testing...';
    PERFORM * FROM membership_fee_view LIMIT 1;
    RAISE NOTICE 'membership_fee_view OK';
  ELSE
    RAISE NOTICE 'membership_fee_view NOT FOUND';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'VIEW TEST ERROR: %', SQLERRM;
END $$;

-- =============================================
-- 9. VALIDATE_METADATA FUNKCIJOS PATIKRA
-- =============================================
SELECT 
  proname,
  CASE 
    WHEN prosrc LIKE '%search_path%' THEN 'HAS search_path (GOOD)'
    ELSE 'MISSING search_path (SECURITY RISK)'
  END AS security_status
FROM pg_proc
WHERE proname = 'validate_metadata'
  AND pronamespace = 'public'::regnamespace;

-- =============================================
-- REZULTATŲ SANTRAUKA
-- =============================================
SELECT '=== FINANCE V20 TEST COMPLETE ===' AS status;

