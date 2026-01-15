-- Create RPC function to update membership status
-- This bypasses any potential Supabase client issues with UPDATE queries
CREATE OR REPLACE FUNCTION public.update_membership_status(
  p_membership_id uuid,
  p_new_status text
)
RETURNS TABLE(
  id uuid,
  member_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count integer;
  v_result_id uuid;
  v_result_status text;
  v_before_status text;
BEGIN
  -- First, check if membership exists and get current status
  SELECT memberships.id, memberships.member_status
  INTO v_result_id, v_before_status
  FROM memberships
  WHERE memberships.id = p_membership_id;
  
  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'No membership found with id: %', p_membership_id;
  END IF;
  
  -- If already the desired status, return early
  IF v_before_status = p_new_status THEN
    RETURN QUERY SELECT v_result_id, v_before_status;
    RETURN;
  END IF;
  
  -- Update the membership status using RETURNING to get the updated value directly
  -- This ensures we get the actual value that was written, not a potentially stale read
  EXECUTE format('
    UPDATE public.memberships 
    SET member_status = %L 
    WHERE id = %L
    RETURNING id, member_status
  ', p_new_status, p_membership_id)
  INTO v_result_id, v_result_status;
  
  -- Check if update returned a row
  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Update failed: No rows updated for membership id: %', p_membership_id;
  END IF;
  
  -- Verify the returned value matches what we set
  IF v_result_status != p_new_status THEN
    RAISE EXCEPTION 'Update verification failed: Expected %, got %. This suggests a trigger or constraint is reverting the change. Membership id: %', p_new_status, v_result_status, p_membership_id;
  END IF;
  
  -- Return the result
  RETURN QUERY SELECT v_result_id, v_result_status;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_membership_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_membership_status(uuid, text) TO service_role;
