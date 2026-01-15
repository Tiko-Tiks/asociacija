-- ============================================
-- ASSIGN EXISTING USERS → ORGANIZATION (MEMBERSHIPS)
-- ============================================
--
-- Goal:
--   Given existing users by email, assign them to a specific organization
--   by creating memberships (role=MEMBER).
--
-- Notes (Governance/Traceability):
--   - This is a DB-level script intended for DEV/TEST administration.
--   - In production, prefer Server Actions / RPC flows to preserve procedural legitimacy.
--   - We do NOT delete anything. We only insert/update membership state.
--   - Email is stored in auth.users, not in public.users/profiles
--
-- ============================================
-- CONFIG
-- ============================================

-- Target org:
-- Replace with your org_id:
-- 678b0788-b544-4bf8-8cf5-44dfb2185a52

-- Users to assign (replace/edit this list):
-- user1@test.lt
-- user2@test.lt
-- user3@test.lt

-- Desired membership state:
-- If your governance requires approval, change MEMBER_STATUS to 'PENDING'.
-- For fast testing, ACTIVE is common in a dedicated test org.

-- ============================================
-- RUN
-- ============================================

WITH
params AS (
  SELECT
    '678b0788-b544-4bf8-8cf5-44dfb2185a52'::uuid AS org_id,
    'ACTIVE'::member_status AS member_status,     -- change to 'PENDING' if you want approval flow
    'ACTIVE'::member_status AS membership_status, -- memberships.status (technical)
    'Test setup: assigned existing users to org'::text AS status_reason
),
input_emails AS (
  SELECT lower(trim(email)) AS email
  FROM (VALUES
    ('user1@test.lt'),
    ('user2@test.lt'),
    ('user3@test.lt')
  ) AS v(email)
),
found_users AS (
  SELECT au.id AS user_id, au.email
  FROM auth.users au
  JOIN input_emails e ON lower(au.email) = e.email
),
missing_emails AS (
  SELECT e.email
  FROM input_emails e
  LEFT JOIN found_users u ON u.email = e.email
  WHERE u.user_id IS NULL
),
upserted AS (
  INSERT INTO memberships (
    org_id,
    user_id,
    role,
    status,
    member_status,
    status_reason
  )
  SELECT
    p.org_id,
    fu.user_id,
    'MEMBER'::app_role,              -- Cast to enum type
    p.membership_status,
    p.member_status,
    p.status_reason
  FROM found_users fu
  CROSS JOIN params p
  ON CONFLICT (org_id, user_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    member_status = EXCLUDED.member_status,
    status_reason = EXCLUDED.status_reason
  RETURNING org_id, user_id, role, status, member_status
)
SELECT
  'ASSIGNED'::text AS result_type,
  au.email::text,
  up.org_id,
  up.user_id,
  up.role::text AS role,
  up.status::text AS membership_status,
  up.member_status::text AS member_status
FROM upserted up
JOIN auth.users au ON au.id = up.user_id

UNION ALL

SELECT
  'MISSING_USER'::text AS result_type,
  me.email::text,
  NULL::uuid AS org_id,
  NULL::uuid AS user_id,
  NULL::text AS role,
  NULL::text AS membership_status,
  NULL::text AS member_status
FROM missing_emails me

ORDER BY result_type, email;

-- ============================================
-- VERIFY (optional)
-- ============================================

-- Check what was assigned:
-- SELECT 
--   au.email,
--   p.full_name,
--   m.role,
--   m.member_status,
--   m.status,
--   m.status_reason
-- FROM auth.users au
-- JOIN memberships m ON m.user_id = au.id
-- LEFT JOIN profiles p ON p.id = au.id
-- WHERE m.org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
--   AND au.email IN ('user1@test.lt', 'user2@test.lt', 'user3@test.lt')
-- ORDER BY au.email;

-- Or use: sql/inspect_user_organizations.sql
-- and set email to user1@test.lt to confirm org membership.

