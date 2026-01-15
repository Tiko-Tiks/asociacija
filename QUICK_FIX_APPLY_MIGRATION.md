# 🔧 QUICK FIX: Apply Migration for Member Approval

## Problem
Member approval is failing because the RPC function `update_membership_status` doesn't exist in the database.

## Solution
Apply the migration SQL to create the RPC function.

## Steps to Apply (Choose One Method)

### Method 1: Supabase Dashboard (Easiest - Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste SQL**
   - Open the file: `supabase/migrations/20260122_create_update_membership_status_rpc.sql`
   - Copy ALL the contents
   - Paste into the SQL Editor

4. **Execute**
   - Click "Run" or press Ctrl+Enter
   - You should see "Success. No rows returned"

5. **Verify**
   - Run this query to verify the function exists:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name = 'update_membership_status';
   ```
   - Should return 1 row

### Method 2: Direct SQL (If you have database access)

Run this SQL directly in your database:

```sql
-- Create RPC function to update membership status
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
AS $$
BEGIN
  -- Update the membership status
  UPDATE memberships
  SET member_status = p_new_status
  WHERE id = p_membership_id;
  
  -- Return the updated row
  RETURN QUERY
  SELECT m.id, m.member_status
  FROM memberships m
  WHERE m.id = p_membership_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_membership_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_membership_status(uuid, text) TO service_role;
```

## After Applying

1. **Test the function** (optional):
   ```sql
   -- Test with a sample membership ID (replace with actual ID)
   SELECT * FROM update_membership_status('your-membership-id-here', 'ACTIVE');
   ```

2. **Try approving a member again** in the UI
   - The approval should now work

## Troubleshooting

- **If you get "permission denied"**: Make sure you're using a user with CREATE FUNCTION permissions
- **If function still not found**: Wait a few seconds and try again (Supabase cache may need to refresh)
- **If still failing**: Check Supabase logs for any errors
