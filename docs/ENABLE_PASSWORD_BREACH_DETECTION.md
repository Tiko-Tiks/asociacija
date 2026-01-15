# Enable Password Breach Detection (HaveIBeenPwned)

## Overview

Supabase Auth can check user passwords against the HaveIBeenPwned.org database to prevent the use of compromised passwords. This is a security best practice that should be enabled.

## How to Enable

This feature must be enabled through the Supabase Dashboard, as it's a project-level configuration setting, not a database migration.

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard
   - Select your Branduolys project

2. **Navigate to Authentication Settings**
   - Go to **Authentication** → **Settings** (or **Authentication** → **Policies** → **Password**)
   - Look for the **"Password Security"** or **"Password Requirements"** section
   - Scroll down to find password-related security settings

3. **Enable Password Breach Detection**
   - Find the setting: **"Prevent leaked passwords"** or **"Leaked password protection"** or **"Check passwords against HaveIBeenPwned"**
   - The exact label may vary depending on your Supabase version
   - Toggle it to **Enabled** (ON) or check the checkbox
   - The setting should show: "Prevents the use of compromised passwords by checking against HaveIBeenPwned.org"
   - Click **Save** or the changes should auto-save

**Note:** This feature may only be available on **Pro** or higher plans. If you don't see this option, you may need to upgrade your Supabase plan.

### Alternative: Using Supabase Management API

If you prefer to enable this programmatically, you can use the Supabase Management API:

```bash
# Get your access token from Supabase Dashboard → Settings → API
curl -X PATCH 'https://api.supabase.com/v1/projects/{project_ref}/config/auth' \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "EXTERNAL_PASSWORD_BREACH_CHECK": true
  }'
```

## What This Does

- When users sign up or change their password, Supabase will check the password hash against HaveIBeenPwned.org's database
- If the password has been found in a data breach, the user will be prevented from using it
- This helps protect user accounts from credential stuffing attacks

## Security Benefits

✅ Prevents users from using compromised passwords  
✅ Reduces risk of credential stuffing attacks  
✅ Enhances overall account security  
✅ Follows security best practices  

## Important Notes

- This feature uses the HaveIBeenPwned API (k-anonymity method)
- No actual passwords are sent to HaveIBeenPwned - only password hash prefixes
- The check happens server-side during password validation
- This is a free service provided by HaveIBeenPwned.org
- **Plan Requirement:** This feature may only be available on **Pro** or higher Supabase plans
- If the option is not visible, check your current plan and consider upgrading if needed

## Verification

After enabling, test by:
1. Try to sign up with a known compromised password (e.g., "password123" or "12345678")
2. You should receive an error message indicating the password has been compromised
3. The exact error message format depends on your Supabase Auth configuration
4. Common error messages:
   - "Password has been found in a data breach"
   - "This password has been compromised"
   - "Password is too common or has been leaked"

## Troubleshooting

### Can't Find the Setting

If you don't see the "Prevent leaked passwords" option:

1. **Check Your Plan**
   - This feature may require a **Pro** or higher plan
   - Go to **Settings** → **Billing** to check your current plan
   - Upgrade if necessary

2. **Check Supabase Version**
   - Ensure you're using a recent version of Supabase
   - Some older projects may not have this feature available
   - Contact Supabase support if needed

3. **Alternative Location**
   - The setting might be under **Authentication** → **Policies** → **Password**
   - Or in **Project Settings** → **Auth** → **Password Security**

### Setting Not Working

If you've enabled it but it's not working:

1. **Clear Browser Cache** - Sometimes UI updates require a refresh
2. **Check API Response** - The error should come from Supabase Auth API
3. **Verify Plan** - Ensure your plan supports this feature
4. **Contact Support** - If issues persist, contact Supabase support

---

**Status**: ⚠️ **ACTION REQUIRED** - This must be enabled manually in Supabase Dashboard  
**Priority**: High (Security Best Practice)  
**Last Updated**: 2026-01-06

