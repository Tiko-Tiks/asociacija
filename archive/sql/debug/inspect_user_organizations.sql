-- ============================================
-- INSPECT: USER → ORGANIZATIONS (+ MEMBERSHIPS, POSITIONS)
-- ============================================
--
-- Purpose:
--   Quickly see which organizations a user belongs to, including:
--   - org.slug / org.name / org.status
--   - membership.role (technical access)
--   - membership.member_status (lifecycle)
--   - membership.status (if used separately)
--   - active positions (authority expressed via positions)
--
-- Governance notes:
--   - role ≠ authority (authority is ONLY via positions)
--   - no deletes; read-only inspection
--
-- How to use:
--   - Option A: set the email in the first CTE
--   - Option B: set the user_id directly
--
-- ============================================

-- ============================================================
-- OPTION A: Lookup by email
-- ============================================================
-- Replace the email below, then run the whole query.

WITH input AS (
  SELECT 'test.member.1@example.com'::text AS email
),
u AS (
  SELECT id AS user_id, email
  FROM users
  WHERE lower(email) = lower((SELECT email FROM input))
)
SELECT
  u.user_id,
  u.email,
  o.id AS org_id,
  o.slug AS org_slug,
  o.name AS org_name,
  o.status AS org_status,
  m.id AS membership_id,
  m.role AS membership_role,
  m.status AS membership_status,
  m.member_status AS member_status,
  m.status_reason,
  m.created_at AS membership_created_at,
  m.updated_at AS membership_updated_at,
  COALESCE(p.active_positions, ARRAY[]::text[]) AS active_positions
FROM u
LEFT JOIN memberships m
  ON m.user_id = u.user_id
LEFT JOIN orgs o
  ON o.id = m.org_id
LEFT JOIN LATERAL (
  SELECT array_agg(pos.title ORDER BY pos.title) AS active_positions
  FROM positions pos
  WHERE pos.org_id = m.org_id
    AND pos.user_id = m.user_id
    AND pos.is_active = true
) p ON true
ORDER BY o.slug NULLS LAST, m.created_at DESC;

-- ============================================================
-- OPTION B: Lookup by user_id
-- ============================================================
-- Uncomment and replace the UUID, then run.

-- WITH u AS (
--   SELECT id AS user_id, email
--   FROM users
--   WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
-- )
-- SELECT
--   u.user_id,
--   u.email,
--   o.id AS org_id,
--   o.slug AS org_slug,
--   o.name AS org_name,
--   o.status AS org_status,
--   m.id AS membership_id,
--   m.role AS membership_role,
--   m.status AS membership_status,
--   m.member_status AS member_status,
--   m.status_reason,
--   m.created_at AS membership_created_at,
--   m.updated_at AS membership_updated_at,
--   COALESCE(p.active_positions, ARRAY[]::text[]) AS active_positions
-- FROM u
-- LEFT JOIN memberships m
--   ON m.user_id = u.user_id
-- LEFT JOIN orgs o
--   ON o.id = m.org_id
-- LEFT JOIN LATERAL (
--   SELECT array_agg(pos.title ORDER BY pos.title) AS active_positions
--   FROM positions pos
--   WHERE pos.org_id = m.org_id
--     AND pos.user_id = m.user_id
--     AND pos.is_active = true
-- ) p ON true
-- ORDER BY o.slug NULLS LAST, m.created_at DESC;

-- ============================================================
-- EXTRA: Quick summary (counts by org + status)
-- ============================================================
-- Replace email and run if you want a compact summary.

-- WITH u AS (
--   SELECT id AS user_id
--   FROM users
--   WHERE lower(email) = lower('test.member.1@example.com')
-- )
-- SELECT
--   o.slug AS org_slug,
--   o.status AS org_status,
--   m.role AS membership_role,
--   m.member_status,
--   COUNT(*) AS memberships_count
-- FROM memberships m
-- JOIN orgs o ON o.id = m.org_id
-- JOIN u ON u.user_id = m.user_id
-- GROUP BY o.slug, o.status, m.role, m.member_status
-- ORDER BY o.slug, m.role, m.member_status;


