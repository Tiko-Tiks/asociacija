-- ==================================================
-- FINANCE V20 - NO METADATA WORKAROUND
-- ==================================================
-- PROBLEMA: invoices lentelė NETURI metadata stulpelio
-- SPRENDIMAS: Naudojame description lauką kaip project tag source
-- GOVERNANCE: Jokių schema keitimų, tik VIEW'ai
-- ==================================================

-- =============================================
-- CLEANUP: DROP EXISTING VIEWS (stulpelių struktūra pasikeitė)
-- =============================================
DROP VIEW IF EXISTS project_finance_indicators_view CASCADE;
DROP VIEW IF EXISTS project_finance_view CASCADE;
DROP VIEW IF EXISTS membership_fee_view CASCADE;
DROP VIEW IF EXISTS invoice_summary_view CASCADE;
DROP VIEW IF EXISTS org_finance_overview CASCADE;
DROP VIEW IF EXISTS finance_export_view CASCADE;

-- =============================================
-- ETAPAS 1: MEMBERSHIP FEE VIEW (veikia be metadata)
-- =============================================
-- Nario mokesčiai identifikuojami pagal description arba amount pattern
CREATE OR REPLACE VIEW membership_fee_view AS
SELECT
  i.org_id,
  i.membership_id,
  date_trunc('month', i.due_date)::date AS period_start,
  SUM(i.amount) AS amount_total,
  COUNT(*) AS invoices_count,
  array_agg(i.id ORDER BY i.due_date) AS invoice_ids
FROM invoices i
WHERE i.description ILIKE '%nario mokestis%'
   OR i.description ILIKE '%membership%'
   OR i.description ILIKE '%fee%'
GROUP BY i.org_id, i.membership_id, date_trunc('month', i.due_date)::date;

COMMENT ON VIEW membership_fee_view IS 
'Governance v19.0: Read-only nario mokesčių suvestinė. Identifikuoja pagal description lauką. Jokios sprendimų galios.';

-- =============================================
-- ETAPAS 2: PROJECT FINANCE VIEW (iš resolutions)
-- =============================================
-- Projekto biudžetas iš APPROVED resolutions su project metadata
CREATE OR REPLACE VIEW project_finance_view AS
WITH resolution_projects AS (
  SELECT
    r.org_id,
    r.id AS resolution_id,
    r.title AS project_title,
    r.metadata ->> 'project.tag' AS project_tag,
    r.metadata ->> 'project.phase' AS project_phase,
    COALESCE((r.metadata ->> 'indicator.budget_planned')::numeric, 0) AS planned_amount,
    COALESCE((r.metadata ->> 'indicator.budget_spent')::numeric, 0) AS spent_amount,
    r.adopted_at AS approved_at
  FROM resolutions r
  WHERE r.status = 'APPROVED'
    AND (r.metadata ? 'project.tag' OR r.metadata ? 'project.phase')
)
SELECT
  rp.org_id,
  rp.resolution_id,
  rp.project_title,
  rp.project_tag,
  rp.project_phase,
  rp.planned_amount,
  rp.spent_amount,
  (rp.planned_amount - rp.spent_amount) AS budget_remaining,
  CASE 
    WHEN rp.planned_amount > 0 
    THEN ROUND((rp.spent_amount / rp.planned_amount) * 100, 2)
    ELSE 0
  END AS utilization_percent,
  rp.approved_at
FROM resolution_projects rp;

COMMENT ON VIEW project_finance_view IS 
'Governance v19.0: Read-only projekto finansų vaizdas. Šaltinis: APPROVED resolutions su project metadata. Jokios sprendimų galios.';

-- =============================================
-- ETAPAS 3: INVOICE SUMMARY VIEW (be metadata)
-- =============================================
-- Bendras invoices sąrašas su statusais
CREATE OR REPLACE VIEW invoice_summary_view AS
SELECT
  i.org_id,
  i.status,
  COUNT(*) AS invoice_count,
  SUM(i.amount) AS total_amount,
  MIN(i.due_date) AS earliest_due,
  MAX(i.due_date) AS latest_due
FROM invoices i
GROUP BY i.org_id, i.status;

COMMENT ON VIEW invoice_summary_view IS 
'Governance v19.0: Read-only sąskaitų suvestinė pagal statusą. Jokios sprendimų galios.';

-- =============================================
-- ETAPAS 4: ORG FINANCE OVERVIEW
-- =============================================
CREATE OR REPLACE VIEW org_finance_overview AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  -- Invoice stats
  COALESCE(inv.total_invoices, 0) AS total_invoices,
  COALESCE(inv.paid_amount, 0) AS paid_amount,
  COALESCE(inv.pending_amount, 0) AS pending_amount,
  COALESCE(inv.overdue_amount, 0) AS overdue_amount,
  -- Project stats
  COALESCE(prj.project_count, 0) AS project_count,
  COALESCE(prj.total_budget_planned, 0) AS total_budget_planned,
  COALESCE(prj.total_budget_spent, 0) AS total_budget_spent
FROM orgs o
LEFT JOIN (
  SELECT 
    org_id,
    COUNT(*) AS total_invoices,
    SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) AS paid_amount,
    SUM(CASE WHEN status = 'SENT' THEN amount ELSE 0 END) AS pending_amount,
    SUM(CASE WHEN status = 'OVERDUE' THEN amount ELSE 0 END) AS overdue_amount
  FROM invoices
  GROUP BY org_id
) inv ON inv.org_id = o.id
LEFT JOIN (
  SELECT
    org_id,
    COUNT(*) AS project_count,
    SUM(COALESCE((metadata ->> 'indicator.budget_planned')::numeric, 0)) AS total_budget_planned,
    SUM(COALESCE((metadata ->> 'indicator.budget_spent')::numeric, 0)) AS total_budget_spent
  FROM resolutions
  WHERE status = 'APPROVED'
    AND (metadata ? 'project.tag' OR metadata ? 'project.phase')
  GROUP BY org_id
) prj ON prj.org_id = o.id;

COMMENT ON VIEW org_finance_overview IS 
'Governance v19.0: Read-only organizacijos finansų apžvalga. Jokios sprendimų galios.';

-- =============================================
-- ETAPAS 5: PROJECT INDICATORS VIEW (runtime)
-- =============================================
CREATE OR REPLACE VIEW project_finance_indicators_view AS
SELECT
  pf.org_id,
  pf.resolution_id,
  pf.project_title,
  pf.project_tag,
  pf.project_phase,
  pf.planned_amount,
  pf.spent_amount,
  pf.budget_remaining,
  pf.utilization_percent,
  -- Runtime indicators
  CASE 
    WHEN pf.utilization_percent > 100 THEN 'OVER_BUDGET'
    WHEN pf.utilization_percent > 80 THEN 'HIGH_UTILIZATION'
    WHEN pf.utilization_percent > 50 THEN 'NORMAL'
    ELSE 'LOW_UTILIZATION'
  END AS budget_status_indicator
FROM project_finance_view pf;

COMMENT ON VIEW project_finance_indicators_view IS 
'Governance v19.0: Read-only projekto indikatoriai. Runtime skaičiavimai, jokios sprendimų galios.';

-- =============================================
-- ETAPAS 6: EXPORT VIEW (atsekamumas)
-- =============================================
CREATE OR REPLACE VIEW finance_export_view AS
SELECT
  i.id AS invoice_id,
  i.org_id,
  o.name AS org_name,
  i.membership_id,
  p.full_name AS member_name,
  i.amount,
  i.description,
  i.due_date,
  i.status,
  i.created_at
FROM invoices i
JOIN orgs o ON o.id = i.org_id
LEFT JOIN memberships m ON m.id = i.membership_id
LEFT JOIN profiles p ON p.id = m.user_id;

COMMENT ON VIEW finance_export_view IS 
'Governance v19.0: Read-only eksporto vaizdas. Kiekvienas įrašas atsekamas iki invoice. Jokios sprendimų galios.';

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT SELECT ON membership_fee_view TO authenticated;
GRANT SELECT ON project_finance_view TO authenticated;
GRANT SELECT ON invoice_summary_view TO authenticated;
GRANT SELECT ON org_finance_overview TO authenticated;
GRANT SELECT ON project_finance_indicators_view TO authenticated;
GRANT SELECT ON finance_export_view TO authenticated;

-- =============================================
-- VERIFICATION
-- =============================================
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN (
      'membership_fee_view',
      'project_finance_view',
      'invoice_summary_view',
      'org_finance_overview',
      'project_finance_indicators_view',
      'finance_export_view'
    );
  
  RAISE NOTICE 'Created % finance views', v_count;
  
  IF v_count = 6 THEN
    RAISE NOTICE 'SUCCESS: All Finance V20 views created';
  ELSE
    RAISE WARNING 'Some views may be missing';
  END IF;
END $$;

SELECT '=== FINANCE V20 WORKAROUND COMPLETE ===' AS status;

