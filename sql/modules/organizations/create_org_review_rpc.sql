-- ==================================================
-- Organization Review Request RPC Functions
-- ==================================================
-- Vienintelis kelias sukurti/adminuoti admin užklausas
-- ==================================================

-- Helper function to check if user is platform admin
-- Adjust this based on your actual platform admin mechanism
-- Drop ALL existing functions with this name (regardless of signature)
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Find and drop all functions named is_platform_admin
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'is_platform_admin'
  LOOP
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', r.proname, r.args);
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignore errors
        NULL;
    END;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if platform_admins table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'platform_admins'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = p_user_id
        AND is_active = true
    );
  END IF;
  
  -- Check if users table has is_platform_admin column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' 
      AND table_name = 'users' 
      AND column_name = 'is_platform_admin'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = p_user_id
        AND is_platform_admin = true
    );
  END IF;
  
  -- If no mechanism exists, return false (security by default)
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_platform_admin IS 'Patikrina ar vartotojas yra Branduolio admin';

-- Helper function to check if user is OWNER of org
CREATE OR REPLACE FUNCTION public.is_org_owner(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.user_id = p_user_id
      AND m.org_id = p_org_id
      AND m.role = 'OWNER'
      -- Use member_status (text) instead of status (enum)
      -- Allow PENDING for V2 pre-onboarding (membership created with PENDING status)
      AND m.member_status IN ('ACTIVE', 'PENDING')
      -- Allow ONBOARDING and SUBMITTED_FOR_REVIEW for V2 pre-onboarding flow
      -- Also allow ACTIVE for normal operations
      AND o.status IN ('ACTIVE', 'ONBOARDING', 'SUBMITTED_FOR_REVIEW')
  );
END;
$$;

COMMENT ON FUNCTION public.is_org_owner IS 'Patikrina ar vartotojas yra organizacijos OWNER';

-- ==================================================
-- 1. submit_org_for_review
-- ==================================================
-- Sukuria admin užklausą tik jei org yra ready
CREATE OR REPLACE FUNCTION public.submit_org_for_review(
  p_org_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  request_id UUID,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_owner BOOLEAN;
  v_readiness RECORD;
  v_request_id UUID;
  v_existing_request UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if user is OWNER
  SELECT public.is_org_owner(v_user_id, p_org_id) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RETURN QUERY SELECT false, 'NOT_OWNER'::TEXT, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if there's already an OPEN request
  SELECT id INTO v_existing_request
  FROM public.org_review_requests
  WHERE org_id = p_org_id
    AND status = 'OPEN';
  
  IF v_existing_request IS NOT NULL THEN
    RETURN QUERY SELECT false, 'ALREADY_SUBMITTED'::TEXT, v_existing_request, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check readiness
  SELECT * INTO v_readiness
  FROM public.org_onboarding_readiness
  WHERE org_id = p_org_id;
  
  IF NOT v_readiness.ready_to_submit THEN
    RETURN QUERY SELECT 
      false, 
      'NOT_READY'::TEXT, 
      NULL::UUID,
      jsonb_build_object(
        'has_required_org_fields', v_readiness.has_required_org_fields,
        'has_bylaws', v_readiness.has_bylaws,
        'has_governance_required', v_readiness.has_governance_required
      );
    RETURN;
  END IF;
  
  -- Create request
  INSERT INTO public.org_review_requests (
    org_id,
    requested_by,
    status,
    note
  ) VALUES (
    p_org_id,
    v_user_id,
    'OPEN',
    p_note
  )
  RETURNING id INTO v_request_id;
  
  -- Update org status
  UPDATE public.orgs
  SET status = 'SUBMITTED_FOR_REVIEW'
  WHERE id = p_org_id;
  
  -- Create notification for platform admin (if notifications table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'notifications'
  ) THEN
    -- Insert notification for all platform admins
    -- NOTE: notifications table schema: id, user_id, org_id, title, message, link, read_at, created_at
    -- Does NOT have 'type' or 'metadata' columns
    INSERT INTO public.notifications (
      user_id,
      org_id,
      title,
      message,
      link,
      created_at
    )
    SELECT 
      u.id,
      p_org_id,
      'Nauja bendruomenė laukia patvirtinimo',
      'Bendruomenė ' || o.name || ' pateikta tvirtinimui',
      '/admin/org-review/' || v_request_id::text,
      now()
    FROM auth.users u
    CROSS JOIN public.orgs o
    WHERE o.id = p_org_id
      AND public.is_platform_admin(u.id);
  END IF;
  
  RETURN QUERY SELECT true, 'OK'::TEXT, v_request_id, NULL::JSONB;
END;
$$;

COMMENT ON FUNCTION public.submit_org_for_review IS 'Pateikia organizaciją Branduolio admin patvirtinimui (tik jei ready)';

-- ==================================================
-- 2. request_org_changes
-- ==================================================
-- Admin grąžina užklausą taisymams
CREATE OR REPLACE FUNCTION public.request_org_changes(
  p_request_id UUID,
  p_admin_note TEXT
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user is platform admin
  SELECT public.is_platform_admin(v_user_id) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT false, 'NOT_ADMIN'::TEXT;
    RETURN;
  END IF;
  
  -- Get org_id from request
  SELECT org_id INTO v_org_id
  FROM public.org_review_requests
  WHERE id = p_request_id
    AND status = 'OPEN';
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT false, 'REQUEST_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Update request
  UPDATE public.org_review_requests
  SET status = 'NEEDS_CHANGES',
      admin_note = p_admin_note,
      decided_at = now(),
      decided_by = v_user_id
  WHERE id = p_request_id;
  
  -- Update org status
  UPDATE public.orgs
  SET status = 'NEEDS_CHANGES'
  WHERE id = v_org_id;
  
  -- Create notification for org owner
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'notifications'
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      org_id,
      title,
      message,
      link,
      created_at
    )
    SELECT 
      m.user_id,
      v_org_id,
      'Reikia pataisymų registracijoje',
      'Branduolio admin prašo pataisyti registracijos duomenis: ' || COALESCE(p_admin_note, ''),
      '/dashboard/' || o.slug || '/onboarding',
      now()
    FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.org_id = v_org_id
      AND m.role = 'OWNER'
      AND m.status = 'ACTIVE'
      AND o.status = 'ACTIVE'
      -- NOTE: PRE_ORG check removed - metadata column does not exist in orgs table
      -- PRE_ORG organizations should not use this function anyway (V2 uses different flow)
    LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.request_org_changes IS 'Branduolio admin grąžina užklausą taisymams';

-- ==================================================
-- 3. approve_org
-- ==================================================
-- Admin patvirtina organizaciją
CREATE OR REPLACE FUNCTION public.approve_org(
  p_request_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user is platform admin
  SELECT public.is_platform_admin(v_user_id) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT false, 'NOT_ADMIN'::TEXT;
    RETURN;
  END IF;
  
  -- Get org_id from request
  SELECT org_id INTO v_org_id
  FROM public.org_review_requests
  WHERE id = p_request_id
    AND status = 'OPEN';
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT false, 'REQUEST_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Update request
  UPDATE public.org_review_requests
  SET status = 'APPROVED',
      decided_at = now(),
      decided_by = v_user_id
  WHERE id = p_request_id;
  
  -- Update org status and activation
  UPDATE public.orgs
  SET status = 'ACTIVE',
      activated_at = now(),
      activated_by = v_user_id
  WHERE id = v_org_id;
  
  -- Create notification for org owner
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'notifications'
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      org_id,
      title,
      message,
      link,
      created_at
    )
    SELECT 
      m.user_id,
      v_org_id,
      'Bendruomenė patvirtinta',
      'Jūsų bendruomenė buvo patvirtinta ir dabar yra aktyvi',
      '/dashboard/' || o.slug,
      now()
    FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.org_id = v_org_id
      AND m.role = 'OWNER'
      AND m.status = 'ACTIVE'
      AND o.status = 'ACTIVE'
      -- NOTE: PRE_ORG check removed - metadata column does not exist in orgs table
      -- PRE_ORG organizations should not use this function anyway (V2 uses different flow)
    LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.approve_org IS 'Branduolio admin patvirtina organizaciją';

-- ==================================================
-- 4. reject_org
-- ==================================================
-- Admin atmeta organizaciją
CREATE OR REPLACE FUNCTION public.reject_org(
  p_request_id UUID,
  p_admin_note TEXT
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user is platform admin
  SELECT public.is_platform_admin(v_user_id) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT false, 'NOT_ADMIN'::TEXT;
    RETURN;
  END IF;
  
  -- Get org_id from request
  SELECT org_id INTO v_org_id
  FROM public.org_review_requests
  WHERE id = p_request_id
    AND status IN ('OPEN', 'NEEDS_CHANGES');
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT false, 'REQUEST_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Update request
  UPDATE public.org_review_requests
  SET status = 'REJECTED',
      admin_note = p_admin_note,
      decided_at = now(),
      decided_by = v_user_id
  WHERE id = p_request_id;
  
  -- Update org status
  UPDATE public.orgs
  SET status = 'REJECTED'
  WHERE id = v_org_id;
  
  -- Create notification for org owner
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'notifications'
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      org_id,
      title,
      message,
      link,
      created_at
    )
    SELECT 
      m.user_id,
      v_org_id,
      'Bendruomenė atmesta',
      'Jūsų bendruomenės registracija buvo atmesta: ' || COALESCE(p_admin_note, ''),
      '/dashboard/' || o.slug || '/onboarding',
      now()
    FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.org_id = v_org_id
      AND m.role = 'OWNER'
      AND m.status = 'ACTIVE'
      AND o.status = 'ACTIVE'
      -- NOTE: PRE_ORG check removed - metadata column does not exist in orgs table
      -- PRE_ORG organizations should not use this function anyway (V2 uses different flow)
    LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.reject_org IS 'Branduolio admin atmeta organizaciją';

