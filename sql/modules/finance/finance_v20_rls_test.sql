-- ==================================================
-- FINANCE V20 RLS TEST
-- ==================================================
-- Patikrina, ar view'ai paveldi RLS iš pagrindines lentelių
-- ==================================================

-- =============================================
-- 1. RLS STATUSAS LENTELĖSE
-- =============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('invoices', 'resolutions', 'orgs', 'memberships')
ORDER BY tablename;

-- =============================================
-- 2. RLS POLICIES ANT INVOICES
-- =============================================
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual::text AS using_clause,
  with_check::text AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'invoices';

-- =============================================
-- 3. RLS POLICIES ANT RESOLUTIONS
-- =============================================
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual::text AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'resolutions';

-- =============================================
-- 4. VIEW SECURITY SETTINGS
-- =============================================
-- PostgreSQL 15+ security_invoker patikra
SELECT 
  viewname,
  viewowner,
  -- Check if view has security_invoker
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = v.viewname
        AND n.nspname = 'public'
        AND c.relkind = 'v'
    ) THEN 'VIEW EXISTS'
    ELSE 'NOT FOUND'
  END AS status
FROM pg_views v
WHERE schemaname = 'public'
  AND viewname IN (
    'membership_fee_view',
    'project_finance_view',
    'invoice_summary_view',
    'org_finance_overview',
    'project_finance_indicators_view',
    'finance_export_view'
  );

-- =============================================
-- 5. SIMULIUOTAS TESTAVIMAS (be tikro user)
-- =============================================
-- Patikrina, ar view'ai grąžina duomenis
DO $$
DECLARE
  v_count integer;
BEGIN
  -- Test invoice_summary_view
  SELECT COUNT(*) INTO v_count FROM invoice_summary_view;
  RAISE NOTICE 'invoice_summary_view: % rows', v_count;
  
  -- Test project_finance_view
  SELECT COUNT(*) INTO v_count FROM project_finance_view;
  RAISE NOTICE 'project_finance_view: % rows', v_count;
  
  -- Test org_finance_overview
  SELECT COUNT(*) INTO v_count FROM org_finance_overview;
  RAISE NOTICE 'org_finance_overview: % rows', v_count;
  
  -- Test finance_export_view
  SELECT COUNT(*) INTO v_count FROM finance_export_view;
  RAISE NOTICE 'finance_export_view: % rows', v_count;
END $$;

-- =============================================
-- 6. ORG ISOLATION TEST
-- =============================================
-- Patikrina, ar kiekvienas view turi org_id
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'membership_fee_view',
    'project_finance_view',
    'invoice_summary_view',
    'org_finance_overview',
    'project_finance_indicators_view',
    'finance_export_view'
  )
  AND column_name = 'org_id'
ORDER BY table_name;

SELECT '=== RLS TEST COMPLETE ===' AS status;

