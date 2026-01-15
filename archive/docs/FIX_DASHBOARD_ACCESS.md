# Fix Dashboard Access Issue

## Problem
Owner dashboard throws error when trying to access it.

## Root Cause
The code tries to query `logo_url` column from `orgs` table, but if the SQL migration hasn't been run yet, this column doesn't exist, causing a database error.

## Solution Applied

### 1. Error Handling in `getUserOrgs()`
- Added graceful handling for missing `logo_url` column
- If column doesn't exist (error code `42703`), retry query without `logo_url`
- Return `logo_url: null` if column doesn't exist

### 2. Error Handling in `getOrgBySlug()`
- Added graceful handling for missing `logo_url` column
- Retry query without `logo_url` if column doesn't exist

### 3. Error Handling in Settings Page
- Added try-catch for org logo query
- Continue without logo if query fails

### 4. Error Handling in PDF Generation
- Added try-catch for org logo query
- Continue without logo if query fails

## Immediate Fix

The code now handles missing `logo_url` column gracefully. However, to fully enable logo functionality:

1. **Run SQL Migration** (if not already done):
   ```sql
   -- Run sql/add_logo_to_orgs.sql in Supabase SQL Editor
   ```

2. **Create Storage Bucket** (if not already done):
   - Go to Supabase Dashboard → Storage
   - Create bucket: `org-logos`
   - Set as public bucket

## Testing

After applying the fix:
1. Try accessing owner dashboard - should work even without `logo_url` column
2. After running SQL migration, logo functionality will be fully enabled
3. Upload a logo through settings page to test full functionality

