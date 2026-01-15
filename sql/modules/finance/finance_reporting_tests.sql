-- ==================================================
-- Finance + Project Reporting (v20) — Test Checklist
-- Governance Layer v19.0 compliant (read-only checks)
-- ==================================================

-- 1) Schema prerequisites (metadata columns)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
  AND column_name = 'metadata';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'resolutions'
  AND column_name = 'metadata';

-- 2) Validate metadata function search_path (security)
SELECT proname, pg_get_functiondef(p.oid) AS function_def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('validate_metadata', 'validate_invoice_project_tag');

-- 3) Validate triggers exist
SELECT tgname, tgrelid::regclass AS table_name, tgenabled
FROM pg_trigger
WHERE tgname IN (
  'trg_validate_metadata_resolutions',
  'trg_validate_metadata_events',
  'trg_validate_metadata_event_attendance',
  'trg_validate_metadata_meetings',
  'trg_validate_metadata_invoices',
  'trg_validate_invoice_project_tag'
)
ORDER BY tgname;

-- 4) Validate views exist
SELECT schemaname, viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'project_finance_view',
    'membership_fee_view',
    'project_finance_indicators_view',
    'project_finance_category_distribution_view',
    'project_finance_invoice_export_view',
    'project_finance_summary_export_view'
  )
ORDER BY viewname;

-- 5) Read-only view sanity checks (no data modifications)
SELECT * FROM project_finance_view LIMIT 5;
SELECT * FROM membership_fee_view LIMIT 5;
SELECT * FROM project_finance_indicators_view LIMIT 5;
SELECT * FROM project_finance_category_distribution_view LIMIT 5;
SELECT * FROM project_finance_invoice_export_view LIMIT 5;
SELECT * FROM project_finance_summary_export_view LIMIT 5;

-- 6) Data integrity checks (optional, only if data exists)
-- Invoices missing project.tag (should be zero)
SELECT COUNT(*) AS invoices_missing_project_tag
FROM invoices
WHERE metadata IS NOT NULL
  AND NOT (metadata ? 'project.tag');

-- Invoices with forbidden project identifiers (should be zero)
SELECT COUNT(*) AS invoices_with_forbidden_project_ids
FROM invoices
WHERE metadata IS NOT NULL
  AND (
    metadata ? 'project.id'
    OR metadata ? 'project.uuid'
    OR metadata ? 'project.slug'
    OR metadata ? 'project.code'
  );

-- Invalid metadata prefixes in invoices (should be zero)
WITH bad_keys AS (
  SELECT
    i.id,
    k.key
  FROM invoices i
  CROSS JOIN LATERAL jsonb_object_keys(i.metadata) AS k(key)
)
SELECT COUNT(*) AS invalid_invoice_metadata_keys
FROM bad_keys
WHERE key !~ '^(fact|indicator|project|ui|template|ai)\\..+';

