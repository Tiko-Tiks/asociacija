-- ============================================================
-- PILOT SEED DATA SCRIPT (SIMPLIFIED ROLES)
-- ============================================================
-- Purpose: Create 4 Nodes (organizations) with 2-3 members each
-- Usage: Run in Supabase Dashboard → SQL Editor
-- 
-- ROLE STRATEGY:
-- - Only ONE OWNER per Node (Node President)
-- - All other members have MEMBER role (neutral, no special permissions)
-- - This prevents misleading role behavior during pilot testing
-- 
-- IMPORTANT:
-- - Users must exist in auth.users BEFORE running this script
-- - Create users via Supabase Dashboard → Authentication → Users
-- - Update email addresses in this script to match your test users
-- - This script uses direct DB access (SQL only, no service_role code)
-- - Run ONLY in development/testing environment
-- - Do NOT expose this functionality in UI
-- 
-- BEFORE RUNNING:
-- 1. Create test users in Supabase Auth Dashboard
-- 2. Update email addresses below to match your test users
-- 3. Run this script in SQL Editor
-- ============================================================

DO $$
DECLARE
  -- Node 1
  v_node1_org_id uuid;
  v_node1_user1_id uuid;
  v_node1_user2_id uuid;
  v_node1_user3_id uuid;
  
  -- Node 2
  v_node2_org_id uuid;
  v_node2_user1_id uuid;
  v_node2_user2_id uuid;
  
  -- Node 3
  v_node3_org_id uuid;
  v_node3_user1_id uuid;
  v_node3_user2_id uuid;
  v_node3_user3_id uuid;
  
  -- Node 4
  v_node4_org_id uuid;
  v_node4_user1_id uuid;
  v_node4_user2_id uuid;
BEGIN
  
  -- ============================================================
  -- NODE 1: "Pirmoji Bendruomenė"
  -- ============================================================
  
  -- Create organization
  INSERT INTO orgs (name, slug, created_at)
  VALUES ('Pirmoji Bendruomenė', 'pirmoji-bendruomene', NOW())
  RETURNING id INTO v_node1_org_id;
  
  RAISE NOTICE '✅ Created Node 1: Pirmoji Bendruomenė (ID: %)', v_node1_org_id;
  
  -- Get user IDs (users must exist in auth.users - create them via Supabase Dashboard first)
  -- Update these email addresses to match your test users
  SELECT id INTO v_node1_user1_id FROM auth.users WHERE email = 'node1-admin@example.com';
  SELECT id INTO v_node1_user2_id FROM auth.users WHERE email = 'node1-member1@example.com';
  SELECT id INTO v_node1_user3_id FROM auth.users WHERE email = 'node1-member2@example.com';
  
  -- Warn if users don't exist (but continue with other nodes)
  IF v_node1_user1_id IS NULL THEN
    RAISE WARNING '⚠️ User node1-admin@example.com not found - create in Supabase Auth first';
  END IF;
  
  -- Create memberships for Node 1
  -- Only ONE OWNER, all others are MEMBER
  IF v_node1_user1_id IS NOT NULL THEN
    INSERT INTO memberships (org_id, user_id, role, status)
    VALUES (v_node1_org_id, v_node1_user1_id, 'OWNER', 'ACTIVE')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ Added OWNER: node1-admin@example.com to Node 1';
  END IF;
  
  IF v_node1_user2_id IS NOT NULL THEN
    INSERT INTO memberships (org_id, user_id, role, status)
    VALUES (v_node1_org_id, v_node1_user2_id, 'MEMBER', 'ACTIVE')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ Added MEMBER: node1-member1@example.com to Node 1';
  END IF;
  
  IF v_node1_user3_id IS NOT NULL THEN
    INSERT INTO memberships (org_id, user_id, role, status)
    VALUES (v_node1_org_id, v_node1_user3_id, 'MEMBER', 'ACTIVE')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ Added MEMBER: node1-member2@example.com to Node 1';
  END IF;
  
  -- ============================================================
  -- NODE 2: "Antroji Bendruomenė"
  -- ============================================================
  
  INSERT INTO orgs (name, slug, created_at)
  VALUES ('Antroji Bendruomenė', 'antroji-bendruomene', NOW())
  RETURNING id INTO v_node2_org_id;
  
  RAISE NOTICE '✅ Created Node 2: Antroji Bendruomenė (ID: %)', v_node2_org_id;
  
  SELECT id INTO v_node2_user1_id FROM auth.users WHERE email = 'node2-admin@example.com';
  SELECT id INTO v_node2_user2_id FROM auth.users WHERE email = 'node2-member1@example.com';
  
  IF v_node2_user1_id IS NULL THEN
    RAISE WARNING '⚠️ User node2-admin@example.com not found - create in Supabase Auth first';
  END IF;
  
  -- Only ONE OWNER, all others are MEMBER
  IF v_node2_user1_id IS NOT NULL THEN
    INSERT INTO memberships (org_id, user_id, role, status)
    VALUES (v_node2_org_id, v_node2_user1_id, 'OWNER', 'ACTIVE')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ Added OWNER: node2-admin@example.com to Node 2';
  END IF;
  
  IF v_node2_user2_id IS NOT NULL THEN
    INSERT INTO memberships (org_id, user_id, role, status)
    VALUES (v_node2_org_id, v_node2_user2_id, 'MEMBER', 'ACTIVE')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ Added MEMBER: node2-member1@example.com to Node 2';
  END IF;
  
  -- ============================================================
  -- NODE 3: "Trečioji Bendruomenė"
  -- ============================================================
  
  INSERT INTO orgs (name, slug, created_at)
  VALUES ('Trečioji Bendruomenė', 'trecioji-bendruomene', NOW())
  RETURNING id INTO v_node3_org_id;
  
  RAISE NOTICE '✅ Created Node 3: Trečioji Bendruomenė (ID: %)', v_node3_org_id;
  
  SELECT id INTO v_node3_user1_id FROM auth.users WHERE email = 'node3-admin@example.com';
  SELECT id INTO v_node3_user2_id FROM auth.users WHERE email = 'node3-member1@example.com';
  SELECT id INTO v_node3_user3_id FROM auth.users WHERE email = 'node3-member2@example.com';
  
  IF v_node3_user1_id IS NULL THEN
    RAISE WARNING '⚠️ User node3-admin@example.com not found - create in Supabase Auth first';
  END IF;
  
  -- Only ONE OWNER, all others are MEMBER
  IF v_node3_user1_id IS NOT NULL THEN
    INSERT INTO memberships (org_id, user_id, role, status)
    VALUES (v_node3_org_id, v_node3_user1_id, 'OWNER', 'ACTIVE')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ Added OWNER: node3-admin@example.com to Node 3';
  END IF;
  
  IF v_node3_user2_id IS NOT NULL THEN
    INSERT INTO memberships (org_id, user_id, role, status)
    VALUES (v_node3_org_id, v_node3_user2_id, 'MEMBER', 'ACTIVE')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ Added MEMBER: node3-member1@example.com to Node 3';
  END IF;
  
  IF v_node3_user3_id IS NOT NULL THEN
    INSERT INTO memberships (org_id, user_id, role, status)
    VALUES (v_node3_org_id, v_node3_user3_id, 'MEMBER', 'ACTIVE')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ Added MEMBER: node3-member2@example.com to Node 3';
  END IF;
  
  -- ============================================================
  -- NODE 4: "Ketvirtoji Bendruomenė"
  -- ============================================================
  
  INSERT INTO orgs (name, slug, created_at)
  VALUES ('Ketvirtoji Bendruomenė', 'ketvirtoji-bendruomene', NOW())
  RETURNING id INTO v_node4_org_id;
  
  RAISE NOTICE '✅ Created Node 4: Ketvirtoji Bendruomenė (ID: %)', v_node4_org_id;
  
  SELECT id INTO v_node4_user1_id FROM auth.users WHERE email = 'node4-admin@example.com';
  SELECT id INTO v_node4_user2_id FROM auth.users WHERE email = 'node4-member1@example.com';
  
  IF v_node4_user1_id IS NULL THEN
    RAISE WARNING '⚠️ User node4-admin@example.com not found - create in Supabase Auth first';
  END IF;
  
  -- Only ONE OWNER, all others are MEMBER
  IF v_node4_user1_id IS NOT NULL THEN
    INSERT INTO memberships (org_id, user_id, role, status)
    VALUES (v_node4_org_id, v_node4_user1_id, 'OWNER', 'ACTIVE')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ Added OWNER: node4-admin@example.com to Node 4';
  END IF;
  
  IF v_node4_user2_id IS NOT NULL THEN
    INSERT INTO memberships (org_id, user_id, role, status)
    VALUES (v_node4_org_id, v_node4_user2_id, 'MEMBER', 'ACTIVE')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ Added MEMBER: node4-member1@example.com to Node 4';
  END IF;
  
  -- ============================================================
  -- SUMMARY
  -- ============================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PILOT SEED DATA CREATED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created 4 Nodes (organizations)';
  RAISE NOTICE 'Node 1: Pirmoji Bendruomenė (1 OWNER + 2 MEMBER)';
  RAISE NOTICE 'Node 2: Antroji Bendruomenė (1 OWNER + 1 MEMBER)';
  RAISE NOTICE 'Node 3: Trečioji Bendruomenė (1 OWNER + 2 MEMBER)';
  RAISE NOTICE 'Node 4: Ketvirtoji Bendruomenė (1 OWNER + 1 MEMBER)';
  RAISE NOTICE '';
  RAISE NOTICE 'Role Strategy:';
  RAISE NOTICE '  - Only ONE OWNER per Node (Node President)';
  RAISE NOTICE '  - All other members are MEMBER (neutral role)';
  RAISE NOTICE '  - This prevents misleading role behavior during testing';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: Users must be created in Supabase Auth first!';
  RAISE NOTICE 'Update email addresses in this script to match your test users.';
  RAISE NOTICE '';
  
END $$;

