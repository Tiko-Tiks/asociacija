# Registration-Related Files Tree

## 📁 COMMUNITY REGISTRATION

### Pages
```
src/app/register-community/
  └── page.tsx
      └── Public registration form for new communities
```

### API Routes
```
src/app/api/register-community/
  └── route.ts
      └── POST: Creates community_applications entry with token
```

```
src/app/api/admin/community-applications/
  └── route.ts
      └── GET: Admin endpoint to fetch all applications
```

### Server Actions
```
src/app/actions/admin/manage-orgs.ts
  ├── getAllOrganizationsAdmin()
  │   └── Fetches all orgs with governance status for admin review
  ├── activateOrganization()
  │   └── Activates org (sets status to ACTIVE, approves ruleset)
  └── suspendOrganization()
      └── Suspends an organization
```

```
src/app/actions/admin.ts
  └── getCommunityApplications()
      └── Fetches community applications for admin review
```

### SQL / Database
```
sql/modules/organizations/create_community_applications_table.sql
  └── Creates community_applications table with RLS policies
```

```
sql/modules/organizations/add_token_to_community_applications.sql
  └── Adds token and token_expires_at columns
```

```
sql/modules/organizations/add_org_details_to_community_applications.sql
  └── Adds registration_number, address, usage_purpose columns
```

```
sql/modules/organizations/add_pending_to_orgs_status.sql
  └── Adds ONBOARDING status to orgs.status enum
```

### Admin UI
```
src/app/admin/org-requests/
  └── page.tsx
      └── Admin page to review and manage organization requests
```

```
src/components/admin/org-registry-table.tsx
  └── Table component for displaying organizations in admin panel
```

---

## 📁 MEMBER REGISTRATION

### Pages
```
src/app/c/[slug]/
  └── page.tsx
      └── Public community page with member registration form
```

### Components
```
src/components/public/member-registration-form.tsx
  └── Public form for members to register to a community
```

```
src/components/public/community-hero-section.tsx
  └── Hero section on public community page (may include registration CTA)
```

### Server Actions
```
src/app/actions/register-member.ts
  ├── registerMember()
  │   ├── Validates email and organization
  │   ├── Checks governance setting (new_member_approval)
  │   ├── Creates/updates membership (ACTIVE or PENDING)
  │   ├── Sends emails to member and OWNER
  │   └── Logs audit entry
  └── Handles existing users only (cannot create new auth users)
```

### SQL / RPC Functions
```
sql/modules/governance/update_governance_questionnaire_v2.sql
  └── Contains get_governance_string() RPC (used for new_member_approval)
```

```
sql/consolidated_all.sql
  └── Contains get_governance_string() RPC function
      └── Used to check new_member_approval setting
```

### Email Templates
```
src/lib/email-templates.ts
  ├── getMemberRegistrationEmail()
  │   └── Email sent to new member
  └── getMemberRegistrationOwnerNotificationEmail()
      └── Email sent to OWNER when approval required
```

---

## 📁 AUTH / ONBOARDING

### Pages
```
src/app/onboarding/
  └── page.tsx
      └── Onboarding landing page (if exists)
```

```
src/app/onboarding/continue/
  └── page.tsx
      └── Token-based page to continue registration from email link
```

```
src/app/(dashboard)/dashboard/[slug]/onboarding/
  ├── layout.tsx
  │   └── Layout wrapper for onboarding pages
  └── page.tsx
      └── Main onboarding wizard page (requires auth)
```

### API Routes
```
src/app/api/onboarding/application/
  └── route.ts
      └── GET: Fetches application by token (public)
```

```
src/app/api/onboarding/start/
  └── route.ts
      └── POST: Creates user, org, and membership from token
          ├── Creates Supabase Auth user
          ├── Creates profile
          ├── Creates org (status: ONBOARDING)
          ├── Creates membership (OWNER, ACTIVE)
          └── Returns password for auto-login
```

```
src/app/api/onboarding/status/
  └── (directory exists, may contain status endpoint)
```

### Components
```
src/components/onboarding/onboarding-wizard.tsx
  └── Main wizard component orchestrating onboarding steps
      ├── Step 1: Governance questions
      ├── Step 2: Consents
      └── Step 3: Waiting for approval
```

```
src/components/onboarding/governance-step.tsx
  └── Step 1: Governance questionnaire form
```

```
src/components/onboarding/board-members-step.tsx
  └── Sub-step: Assign board members (if required)
```

```
src/components/onboarding/consents-step.tsx
  └── Step 2: Consent acceptance form
```

```
src/components/onboarding/waiting-step.tsx
  └── Step 3: Waiting for admin approval message
```

```
src/components/onboarding/readiness-checklist.tsx
  └── Checklist showing what's needed for activation
```

```
src/components/onboarding/onboarding-continue-client.tsx
  └── Client component for /onboarding/continue page
      └── Handles token validation and onboarding start
```

```
src/components/onboarding/onboarding-blocker.tsx
  └── Component that blocks dashboard access during onboarding
```

```
src/components/onboarding/consent-document-viewer.tsx
  └── Component to view consent documents
```

```
src/components/onboarding/password-setup.tsx
  └── Component for password setup (if exists)
```

### Server Actions
```
src/app/actions/onboarding-status.ts
  ├── getOnboardingStatus()
  │   └── Returns current onboarding step and completion status
  └── OnboardingStatus interface
      └── Defines onboarding state structure
```

```
src/app/actions/onboarding.ts
  ├── getOnboardingReadiness()
  │   └── Checks if org is ready to submit for review
  ├── submitOrgForReview()
  │   └── Submits org for admin review
  ├── getReviewRequest()
  │   └── Gets review request status
  └── ReviewRequest interface
```

```
src/app/actions/governance-submission.ts
  ├── submitGovernanceAnswers()
  │   ├── Creates/updates governance_configs
  │   ├── Creates org_rulesets (status: PROPOSED)
  │   └── Sends notification email
  └── GovernanceAnswers interface
```

```
src/app/actions/consents.ts
  ├── acceptConsent()
  │   └── Records consent acceptance in org_consents
  ├── getRequiredConsents()
  │   └── Returns list of required consents for user role
  ├── hasAllRequiredConsents()
  │   └── Checks if user has accepted all required consents
  └── ConsentType constants
```

```
src/app/actions/org-activation.ts
  ├── activateOrganization()
  │   ├── Sets org.status = ACTIVE
  │   ├── Sets org_rulesets.status = ACTIVE
  │   └── Sends activation email to chairman
  └── Used by admin to approve organizations
```

```
src/app/actions/board-members.ts
  ├── checkBoardMembersAssigned()
  │   └── Checks if board members are assigned
  └── Used during onboarding step 1
```

```
src/app/actions/governance-questions.ts
  └── Fetches governance questions for onboarding
```

### Domain Guards
```
src/app/domain/guards/onboardingAccess.ts
  ├── requireOnboardingAccess()
  │   ├── Validates user is OWNER
  │   ├── Validates org is NOT fully active
  │   └── Throws if access denied
  └── checkOnboardingAccess()
      └── Non-throwing version for UI checks
```

### Auth Actions
```
src/app/actions/auth.ts
  ├── login()
  │   └── Authenticates user with email/password
  ├── logout()
  │   └── Signs out user
  ├── getCurrentUser()
  │   └── Gets current authenticated user
  ├── signUp()
  │   └── Creates new user account
  └── passwordReset()
      └── Handles password reset flow
```

### SQL / Database
```
sql/modules/organizations/create_org_review_requests.sql
  └── Creates org_review_requests table for admin review workflow
```

```
sql/modules/organizations/create_org_review_rpc.sql
  ├── submit_org_for_review()
  ├── approve_org()
  ├── reject_org()
  └── request_org_changes()
```

```
sql/modules/governance/board_onboarding_questions.sql
  └── Board member assignment logic for onboarding
```

```
sql/modules/migrations/update_onboarding_questionnaire.sql
  └── Updates governance questionnaire with new_member_approval
```

```
sql/modules/migrations/flow_migration.sql
  └── Contains governance migration including new_member_approval
```

### Views
```
sql/consolidated_all.sql
  └── Contains org_activation_state view
      └── Used to check org activation status
```

---

## 📁 SHARED / UTILITIES

### Email
```
src/lib/email.ts
  └── sendEmail() - Email sending utility
```

```
src/lib/email-templates.ts
  ├── getRegistrationConfirmationEmail()
  │   └── Email sent after community registration
  ├── getRegistrationAdminEmail()
  │   └── Email sent to admin about new registration
  ├── getMemberRegistrationEmail()
  │   └── Email sent to new member
  └── getMemberRegistrationOwnerNotificationEmail()
      └── Email sent to OWNER when member approval needed
```

### Audit
```
src/app/utils/audit.ts
  └── Audit logging utilities
```

### Test Routes
```
src/app/api/test-registration-email/
  └── route.ts
      └── Test endpoint for registration emails
```

```
src/app/api/test-email/
  └── route.ts
      └── Test endpoint for emails
```

---

## 📊 SUMMARY STATISTICS

- **Community Registration**: 8 files (pages, API, actions, SQL)
- **Member Registration**: 5 files (pages, components, actions, SQL)
- **Auth/Onboarding**: 30+ files (pages, components, actions, guards, SQL)
- **Shared/Utilities**: 4 files (email, audit, test)

**Total**: ~47 registration-related files

---

## 🔍 KEY DATABASE TABLES

1. **community_applications** - Registration requests
2. **orgs** - Organizations (status: ONBOARDING → ACTIVE)
3. **memberships** - User-org relationships
4. **governance_configs** - Governance answers
5. **org_rulesets** - Organization rulesets (status: PROPOSED → ACTIVE)
6. **org_consents** - Consent acceptances
7. **board_member_assignments** - Board member assignments
8. **org_review_requests** - Admin review workflow
9. **audit_logs** - Audit trail

---

## 🔑 KEY RPC FUNCTIONS

1. **get_governance_string()** - Gets governance setting (e.g., new_member_approval)
2. **submit_org_for_review()** - Submits org for admin review
3. **approve_org()** - Approves organization
4. **reject_org()** - Rejects organization
5. **request_org_changes()** - Requests changes to org application

---

## 📝 NOTES

- Member registration currently **cannot create new auth users** (requires service_role)
- Community registration **can create auth users** (uses service_role in API route)
- Onboarding is protected by `requireOnboardingAccess()` guard
- All registration processes include audit logging
- Email notifications are soft-fail (errors don't block process)
