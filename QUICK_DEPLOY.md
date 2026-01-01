# Quick Deploy Guide - Vercel + Supabase

## 🚀 5-Minute Deployment

### Step 1: Get Supabase Credentials (2 min)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project → **Settings** → **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 2: Deploy to Vercel (3 min)

1. Go to [vercel.com](https://vercel.com) → **Sign Up** (with GitHub)
2. Click **Add New Project**
3. Import your repository
4. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
   ```
   (Select all environments: Production, Preview, Development)
5. Click **Deploy**

### Step 3: Verify (1 min)

1. Visit your deployment URL
2. Test authentication
3. Done! 🎉

---

**Detailed instructions:** See `VERCEL_DEPLOYMENT.md`

**Troubleshooting:** Check build logs in Vercel dashboard

