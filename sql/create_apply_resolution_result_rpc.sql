-- ==================================================
-- RPC: apply_resolution_result
-- ==================================================
-- Pritaiko balsavimo rezultatą rezoliucijai
-- Apeinant trigger'ius (SECURITY DEFINER)
-- ==================================================

CREATE OR REPLACE FUNCTION public.apply_resolution_result(
  p_resolution_id uuid,
  p_result text,  -- 'APPROVED' arba 'REJECTED'
  p_adopted_by uuid
)
RETURNS TABLE(
  ok boolean,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate result
  IF p_result NOT IN ('APPROVED', 'REJECTED') THEN
    RETURN QUERY SELECT false, 'INVALID_RESULT'::text;
    RETURN;
  END IF;

  -- Validate resolution exists
  IF NOT EXISTS (SELECT 1 FROM resolutions WHERE id = p_resolution_id) THEN
    RETURN QUERY SELECT false, 'RESOLUTION_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Update resolution
  UPDATE resolutions
  SET 
    status = p_result,
    adopted_at = CASE WHEN p_result = 'APPROVED' THEN NOW() ELSE NULL END,
    adopted_by = CASE WHEN p_result = 'APPROVED' THEN p_adopted_by ELSE NULL END
  WHERE id = p_resolution_id
    AND status = 'PROPOSED';  -- Only update if still PROPOSED

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ALREADY_PROCESSED'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'OK'::text;
END;
$$;

COMMENT ON FUNCTION public.apply_resolution_result IS 
'Applies vote result to a resolution. Used by closeVoteAndApplyResults server action. SECURITY DEFINER to bypass trigger checks.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.apply_resolution_result TO authenticated;

