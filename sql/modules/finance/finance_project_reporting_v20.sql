-- ==================================================
-- Finance + Project Reporting (v20) — Views (Read-only)
-- Governance Layer v19.0 compliant
-- ==================================================

-- ETAPAS 3 — PROJECT FINANCE VIEW
CREATE OR REPLACE VIEW project_finance_view AS
WITH resolution_budget AS (
  SELECT
    r.org_id,
    r.metadata ->> 'project.tag' AS project_tag,
    SUM(COALESCE((r.metadata ->> 'indicator.budget_planned')::numeric, 0)) AS planned_amount
  FROM resolutions r
  WHERE r.status = 'APPROVED'
    AND r.metadata ? 'project.tag'
  GROUP BY r.org_id, r.metadata ->> 'project.tag'
),
invoice_totals AS (
  SELECT
    i.org_id,
    i.metadata ->> 'project.tag' AS project_tag,
    SUM(CASE WHEN i.metadata ->> 'fact.type' = 'income' THEN i.amount ELSE 0 END) AS income_amount,
    SUM(CASE WHEN i.metadata ->> 'fact.type' = 'expense' THEN i.amount ELSE 0 END) AS expense_amount
  FROM invoices i
  WHERE i.metadata ? 'project.tag'
  GROUP BY i.org_id, i.metadata ->> 'project.tag'
)
SELECT
  COALESCE(r.org_id, i.org_id) AS org_id,
  COALESCE(r.project_tag, i.project_tag) AS project_tag,
  COALESCE(r.planned_amount, 0) AS planned_amount,
  COALESCE(i.income_amount, 0) AS income_amount,
  COALESCE(i.expense_amount, 0) AS expense_amount,
  COALESCE(i.income_amount, 0) - COALESCE(i.expense_amount, 0) AS balance
FROM resolution_budget r
FULL OUTER JOIN invoice_totals i
  ON r.org_id = i.org_id
 AND r.project_tag = i.project_tag;

-- ETAPAS 4 — NARIO MOKESČIŲ VIEW
CREATE OR REPLACE VIEW membership_fee_view AS
SELECT
  i.org_id,
  i.membership_id,
  date_trunc('month', i.due_date)::date AS period_start,
  SUM(i.amount) AS amount_total,
  COUNT(*) AS invoices_count
FROM invoices i
WHERE i.metadata ->> 'fact.type' = 'membership_fee'
GROUP BY i.org_id, i.membership_id, date_trunc('month', i.due_date)::date;

-- ETAPAS 5 — NMA / ES PROJEKTŲ RODIKLIAI (runtime)
CREATE OR REPLACE VIEW project_finance_indicators_view AS
SELECT
  pf.org_id,
  pf.project_tag,
  pf.planned_amount,
  pf.income_amount,
  pf.expense_amount,
  pf.balance,
  CASE
    WHEN pf.planned_amount > 0 THEN pf.expense_amount / pf.planned_amount
    ELSE NULL
  END AS indicator_budget_utilization,
  CASE
    WHEN pf.planned_amount > 0 THEN pf.income_amount / pf.planned_amount
    ELSE NULL
  END AS indicator_income_to_plan,
  (pf.planned_amount - pf.expense_amount) AS indicator_budget_variance
FROM project_finance_view pf;

CREATE OR REPLACE VIEW project_finance_category_distribution_view AS
WITH expense_totals AS (
  SELECT
    i.org_id,
    i.metadata ->> 'project.tag' AS project_tag,
    COALESCE(i.metadata ->> 'fact.category', 'uncategorized') AS fact_category,
    SUM(i.amount) AS category_amount
  FROM invoices i
  WHERE i.metadata ->> 'fact.type' = 'expense'
    AND i.metadata ? 'project.tag'
  GROUP BY i.org_id, i.metadata ->> 'project.tag', COALESCE(i.metadata ->> 'fact.category', 'uncategorized')
),
project_totals AS (
  SELECT
    org_id,
    project_tag,
    SUM(category_amount) AS total_amount
  FROM expense_totals
  GROUP BY org_id, project_tag
)
SELECT
  e.org_id,
  e.project_tag,
  e.fact_category,
  e.category_amount,
  CASE
    WHEN p.total_amount > 0 THEN e.category_amount / p.total_amount
    ELSE NULL
  END AS indicator_category_share
FROM expense_totals e
JOIN project_totals p
  ON e.org_id = p.org_id
 AND e.project_tag = p.project_tag;

-- ETAPAS 6 — EKSPORTAS (READ-ONLY)
CREATE OR REPLACE VIEW project_finance_invoice_export_view AS
SELECT
  i.id AS invoice_id,
  i.org_id,
  i.membership_id,
  i.amount,
  i.description,
  i.due_date,
  i.status,
  i.created_at,
  i.metadata ->> 'project.tag' AS project_tag,
  i.metadata ->> 'fact.type' AS fact_type,
  i.metadata ->> 'fact.category' AS fact_category
FROM invoices i
WHERE i.metadata ? 'project.tag';

CREATE OR REPLACE VIEW project_finance_summary_export_view AS
WITH invoice_ids AS (
  SELECT
    i.org_id,
    i.metadata ->> 'project.tag' AS project_tag,
    array_agg(i.id ORDER BY i.due_date) AS invoice_ids
  FROM invoices i
  WHERE i.metadata ? 'project.tag'
  GROUP BY i.org_id, i.metadata ->> 'project.tag'
)
SELECT
  pf.org_id,
  pf.project_tag,
  pf.planned_amount,
  pf.income_amount,
  pf.expense_amount,
  pf.balance,
  ii.invoice_ids
FROM project_finance_view pf
LEFT JOIN invoice_ids ii
  ON pf.org_id = ii.org_id
 AND pf.project_tag = ii.project_tag;

