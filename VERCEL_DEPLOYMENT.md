# Vercel Deployment Guide

Complete step-by-step guide to deploy your Next.js application to Vercel with Supabase.

## Prerequisites

- ✅ GitHub/GitLab/Bitbucket account
- ✅ Code pushed to a repository
- ✅ Supabase project created
- ✅ Supabase project URL and anon key

## Step 1: Prepare Your Repository

### 1.1 Push Code to Git

If you haven't already, push your code to a Git repository:

```bash
# If starting fresh
git init
git add .
git commit -m "Initial commit - ready for deployment"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### 1.2 Verify Repository Structure

Ensure your repository has:
- ✅ `package.json` with build scripts
- ✅ `next.config.js` (optional, Next.js works without it)
- ✅ `.gitignore` excluding `.env*` files
- ✅ All source code in `src/` directory

## Step 2: Get Supabase Credentials

### 2.1 Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project (or create a new one)

### 2.2 Get API Credentials

1. In your Supabase project, click **Settings** (gear icon) in the left sidebar
2. Click **API** in the settings menu
3. You'll see two important values:

   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
   Copy this → This is your `NEXT_PUBLIC_SUPABASE_URL`

   **anon public key:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   Copy this → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

⚠️ **Important**: Only use the **anon/public** key, never the **service_role** key.

### 2.3 Verify Database Setup

Before deploying, ensure:
- [ ] Database migrations are applied
- [ ] RLS policies are enabled
- [ ] Required tables exist
- [ ] Test connection works

## Step 3: Deploy to Vercel

### 3.1 Sign Up / Sign In to Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Click **Sign Up** (or **Log In** if you have an account)
3. Choose **Continue with GitHub** (or GitLab/Bitbucket)
4. Authorize Vercel to access your repositories

### 3.2 Import Your Project

1. In Vercel dashboard, click **Add New...** → **Project**
2. You'll see a list of your repositories
3. Find your repository and click **Import**

### 3.3 Configure Project Settings

Vercel will auto-detect Next.js. Verify these settings:

**Framework Preset:** `Next.js` (auto-detected)

**Root Directory:** `./` (leave as default unless your Next.js app is in a subdirectory)

**Build Command:** `npm run build` (default)

**Output Directory:** `.next` (default, don't change)

**Install Command:** `npm install` (default)

**Node.js Version:** `18.x` or `20.x` (auto-selected)

### 3.4 Set Environment Variables

**This is the most important step!**

1. In the project configuration page, scroll down to **Environment Variables**
2. Click **Add** for each variable:

   **Variable 1:**
   - **Name:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** `https://xxxxxxxxxxxxx.supabase.co` (your Supabase project URL)
   - **Environment:** Select all (Production, Preview, Development)
   - Click **Save**

   **Variable 2:**
   - **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your Supabase anon key)
   - **Environment:** Select all (Production, Preview, Development)
   - Click **Save**

⚠️ **Important**: 
- Make sure both variables are set for **all environments** (Production, Preview, Development)
- Double-check the values are correct (no extra spaces, correct URLs)

### 3.5 Deploy

1. Review all settings one more time
2. Click **Deploy** button
3. Wait for the build to complete (usually 1-3 minutes)

## Step 4: Monitor Deployment

### 4.1 Watch Build Logs

During deployment, you'll see:
- Installing dependencies
- Building application
- Optimizing production build
- Deploying to Vercel Edge Network

### 4.2 Check for Errors

If build fails, check:
- ✅ Environment variables are set correctly
- ✅ All dependencies in `package.json`
- ✅ No TypeScript errors
- ✅ Build command works locally (`npm run build`)

### 4.3 Success!

When deployment succeeds, you'll see:
- ✅ Build completed
- ✅ Deployment URL (e.g., `your-app.vercel.app`)
- ✅ "Ready" status

## Step 5: Post-Deployment Verification

### 5.1 Visit Your Site

1. Click on the deployment URL provided by Vercel
2. Your site should load

### 5.2 Test Authentication

1. Try to sign up or log in
2. Verify Supabase authentication works
3. Check browser console for errors

### 5.3 Test Database Operations

1. Test CRUD operations in your app
2. Verify RLS policies are working
3. Check that data persists correctly

### 5.4 Check Vercel Dashboard

1. Go to your project in Vercel dashboard
2. Check **Deployments** tab
3. Verify latest deployment is **Ready** and **Production**

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Domain

1. In Vercel project settings, go to **Domains**
2. Enter your domain name
3. Follow DNS configuration instructions
4. Wait for DNS propagation (can take up to 48 hours)

### 6.2 SSL Certificate

- Vercel automatically provisions SSL certificates
- HTTPS is enabled by default
- No additional configuration needed

## Step 7: Set Up Automatic Deployments

### 7.1 Git Integration

Vercel automatically:
- ✅ Deploys on push to `main`/`master` branch (Production)
- ✅ Creates preview deployments for pull requests
- ✅ Rebuilds on every commit

### 7.2 Branch Configuration

**Production Branch:**
- Default: `main` or `master`
- Change in: Project Settings → Git → Production Branch

**Preview Deployments:**
- Automatically created for all other branches
- Each PR gets a unique preview URL

## Troubleshooting

### Build Fails

**Error: "Environment variable not found"**
- Solution: Verify environment variables are set in Vercel dashboard
- Check variable names match exactly (case-sensitive)

**Error: "Module not found"**
- Solution: Ensure all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error: "TypeScript errors"**
- Solution: Fix TypeScript errors locally first
- Run `npx tsc --noEmit` to check

### Runtime Errors

**Error: "Supabase connection failed"**
- Solution: Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase project is active

**Error: "Authentication not working"**
- Solution: Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Check Supabase Auth is enabled in dashboard

**Error: "RLS policy violation"**
- Solution: Review RLS policies in Supabase
- Ensure policies allow expected operations

### Performance Issues

**Slow builds:**
- Enable Vercel Build Cache
- Optimize dependencies
- Use Vercel's Edge Network

**Slow page loads:**
- Check Core Web Vitals in Vercel Analytics
- Optimize images and assets
- Use Next.js Image component

## Quick Reference Commands

### Local Testing

```bash
# Test build locally
npm run build

# Test production build locally
npm run build
npm start

# Check TypeScript
npx tsc --noEmit

# Run tests
npm test
```

### Vercel CLI (Optional)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs
```

## Environment Variables Summary

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase Dashboard → Settings → API → anon public key |

## Checklist

Before deploying:
- [ ] Code pushed to Git repository
- [ ] Supabase project created
- [ ] Supabase credentials obtained
- [ ] Database migrations applied
- [ ] RLS policies configured
- [ ] Local build succeeds (`npm run build`)
- [ ] Tests pass (`npm test`)

During deployment:
- [ ] Vercel account created
- [ ] Repository imported
- [ ] Environment variables set
- [ ] Build completes successfully
- [ ] Deployment URL accessible

After deployment:
- [ ] Site loads correctly
- [ ] Authentication works
- [ ] Database operations work
- [ ] No console errors
- [ ] Performance is acceptable

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Support**: https://vercel.com/support

---

**Ready to deploy?** Follow steps 1-5 above, and your app will be live in minutes! 🚀

