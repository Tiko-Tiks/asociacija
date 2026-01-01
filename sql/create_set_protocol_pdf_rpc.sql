-- ==================================================
-- SET PROTOCOL PDF RPC FUNCTION
-- ==================================================
-- Allows updating pdf_path for FINAL protocols (immutable otherwise)
-- ==================================================

CREATE OR REPLACE FUNCTION public.set_protocol_pdf(
  p_protocol_id UUID,
  p_bucket TEXT,
  p_path TEXT
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
  v_protocol RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED';
    RETURN;
  END IF;
  
  -- Get protocol
  SELECT * INTO v_protocol
  FROM public.meeting_protocols
  WHERE id = p_protocol_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'PROTOCOL_NOT_FOUND';
    RETURN;
  END IF;
  
  -- Only allow updating FINAL protocols (immutability: can't change snapshot, but can set PDF)
  IF v_protocol.status != 'FINAL' THEN
    RETURN QUERY SELECT false, 'PROTOCOL_NOT_FINAL';
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_protocol.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_protocol.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'FORBIDDEN';
      RETURN;
    END IF;
  END IF;
  
  -- Update only pdf_bucket and pdf_path (immutable fields remain unchanged)
  UPDATE public.meeting_protocols
  SET 
    pdf_bucket = p_bucket,
    pdf_path = p_path
  WHERE id = p_protocol_id;
  
  RETURN QUERY SELECT true, 'PDF_PATH_UPDATED';
END;
$$;

COMMENT ON FUNCTION public.set_protocol_pdf IS 'Atnaujina PDF path FINAL protokolui (tik OWNER/BOARD, tik pdf_bucket/pdf_path)';

