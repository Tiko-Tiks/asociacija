# Production Deployment Guide

## Overview

This is a Next.js 14 application with Supabase backend, using Server Actions and Row-Level Security (RLS) for data protection.

## Required Environment Variables

The application requires the following environment variables to be set in your production environment:

### Supabase Configuration

```bash
# Public Supabase URL (safe to expose in browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Public Supabase Anon Key (safe to expose in browser, RLS protects data)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### How to Get These Values

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** → use for `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the **anon/public** key → use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Important:** Only use the `anon` key, never the `service_role` key in the application. The application uses authenticated clients with RLS policies for security.

## Pre-Deployment Checklist

### Database Setup

- [ ] All database migrations have been applied to production Supabase instance
- [ ] RLS policies are enabled on all tables
- [ ] Database functions have `search_path` set correctly (if applicable)
- [ ] Test database connection from production environment

### Environment Configuration

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` in production environment
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` in production environment
- [ ] Verify environment variables are not committed to git (check `.gitignore`)

### Build Verification

- [ ] Run `npm run build` locally to verify build succeeds
- [ ] Run `npm test` to ensure all tests pass
- [ ] Verify no TypeScript errors: `npx tsc --noEmit`
- [ ] Check build output for production optimizations

### Security Verification

- [ ] Confirm no `service_role` client usage in server actions
- [ ] Verify no `select('*')` on profiles table in server code
- [ ] All server actions use authenticated clients (`createClient()`)
- [ ] Cross-org validation is enforced in all mutations

## Deployment Steps

### Vercel (Recommended for Next.js)

1. **Connect Repository**
   - Push code to GitHub/GitLab/Bitbucket
   - Import project in Vercel dashboard

2. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Apply to Production environment

3. **Build Settings**
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

4. **Deploy**
   - Push to main/master branch or use Vercel dashboard

### Other Platforms (Netlify, Railway, etc.)

1. **Set Environment Variables**
   - Add required variables in platform settings
   - Ensure `NEXT_PUBLIC_*` variables are exposed to client

2. **Build Configuration**
   - Build command: `npm run build`
   - Start command: `npm start`
   - Node version: 18.x or higher

3. **Deploy**
   - Connect repository and deploy

### Self-Hosted (Docker/VM)

1. **Create `.env.production` file:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NODE_ENV=production
   ```

2. **Build and Start:**
   ```bash
   npm install
   npm run build
   npm start
   ```

3. **Process Manager (PM2 example):**
   ```bash
   pm2 start npm --name "branduolys" -- start
   ```

## Post-Deployment Verification

1. **Health Check**
   - Visit your production URL
   - Check browser console for errors
   - Verify API routes respond correctly

2. **Authentication**
   - Test user login/registration
   - Verify session management works

3. **Database Access**
   - Test CRUD operations
   - Verify RLS policies are enforced
   - Check error handling

4. **Performance**
   - Monitor build output size
   - Check Core Web Vitals
   - Verify static assets load correctly

## Production Considerations

### Performance

- Next.js automatically optimizes builds for production
- Static pages are pre-rendered
- Server components reduce client-side JavaScript
- Build output is minified and optimized

### Security

- All database access goes through Supabase RLS policies
- No `service_role` keys in application code
- Environment variables are server-side only (except `NEXT_PUBLIC_*`)
- HTTPS is enforced in production (via platform)

### Monitoring

- Set up error tracking (e.g., Sentry, LogRocket)
- Monitor Supabase usage and quota
- Track application performance metrics
- Set up alerts for critical errors

### Database Migrations

- Run migrations through Supabase dashboard or CLI
- Test migrations on staging environment first
- Keep migration scripts in version control
- Document any manual migration steps

## Troubleshooting

### Build Failures

- Check Node.js version (requires 18.x+)
- Verify all dependencies are in `package.json`
- Check for TypeScript errors: `npx tsc --noEmit`
- Review build logs for specific errors

### Runtime Errors

- Verify environment variables are set correctly
- Check Supabase project is active and accessible
- Review server logs for detailed error messages
- Verify database migrations have been applied

### Authentication Issues

- Confirm Supabase project is accessible
- Check RLS policies allow expected operations
- Verify session cookies are being set correctly
- Review authentication flow in browser DevTools

## Support

For issues specific to:
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Deployment**: Check your platform's documentation

