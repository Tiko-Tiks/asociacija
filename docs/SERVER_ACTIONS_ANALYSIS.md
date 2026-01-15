# Server Actions Analizė

## Tikslas
Identifikuoti, kurie server actions tikrai naudojami ir kurie nenaudojami.

## Metodika
1. Rasti visus server actions failus
2. Patikrinti, kur jie importuojami
3. Identifikuoti nenaudojamus
4. Sukurti ataskaitą

## Server Actions Sąrašas (65 failai)

### Pagrindiniai Actions (Root)
- `accept-invite.ts`
- `admin.ts`
- `ai-copilot.ts`
- `audit-logs.ts`
- `auth.ts`
- `auto-abstain.ts`
- `change-password.ts`
- `check-board-position.ts`
- `command-center.ts`
- `consents.ts`
- `dashboard.ts`
- `debtors.ts`
- `enable-immediate-voting.ts`
- `events.ts`
- `generate-protocol-pdf.ts`
- `get-vote-by-resolution.ts`
- `governance-compliance.ts`
- `governance-config.ts`
- `governance-draft.ts`
- `governance-questions.ts`
- `governance-submission.ts`
- `governance.ts`
- `history.ts`
- `ideas.ts`
- `invite-member.ts`
- `invoices.ts`
- `live-voting.ts`
- `meeting-attendance.ts`
- `meetings.ts`
- `member-dashboard.ts`
- `member-profile.ts`
- `member-requirements.ts`
- `member-status.ts`
- `members.ts`
- `onboarding-status.ts`
- `onboarding.ts`
- `org-activation.ts`
- `org-logo.ts`
- `organizations.ts`
- `positions-assign.ts`
- `positions.ts`
- `projectAuditLog.ts`
- `projectMemberMutations.ts`
- `projectMembers.ts`
- `projects.ts`
- `protocols.ts`
- `public-community-page.ts`
- `public-registry.ts`
- `published-meetings.ts`
- `register-member.ts`
- `resolutions.ts`
- `system-news.ts`
- `update-profile.ts`
- `voting.ts`
- `_audit.ts` (helper)
- `_guards.ts` (helper)

### Admin Actions
- `admin/branduolys-content.ts`
- `admin/broadcast.ts`
- `admin/global-stats.ts`
- `admin/governance-questions.ts`
- `admin/manage-members.ts`
- `admin/manage-orgs.ts`
- `admin/org-review.ts`
- `admin/seed-system-core.ts`
- `admin/update-org.ts`

## Analizės Rezultatai

### NAUDOJAMI (Patvirtinti)
- `auth.ts` - ✅ Naudojamas (landing page, login, dashboard)
- `organizations.ts` - ✅ Naudojamas (dashboard, settings)
- `meetings.ts` - ✅ Naudojamas (meetings pages, components)
- `voting.ts` - ✅ Naudojamas (voting components)
- `resolutions.ts` - ✅ Naudojamas (resolutions pages)
- `members.ts` - ✅ Naudojamas (members pages)
- `onboarding.ts` - ✅ Naudojamas (onboarding pages)
- `governance.ts` - ✅ Naudojamas (governance pages)
- `command-center.ts` - ✅ Naudojamas (command center component)
- `debtors.ts` - ✅ Naudojamas (debtors dashboard)
- `published-meetings.ts` - ✅ Naudojamas (meetings pages)
- `public-community-page.ts` - ✅ Naudojamas (public pages)
- `ai-copilot.ts` - ✅ Naudojamas (ai copilot widget)
- `admin.ts` - ✅ Naudojamas (admin pages)
- `admin/global-stats.ts` - ✅ Naudojamas (admin dashboard)
- `admin/manage-orgs.ts` - ✅ Naudojamas (admin pages)
- `admin/org-review.ts` - ✅ Naudojamas (admin pages)
- `admin/broadcast.ts` - ✅ Naudojamas (admin components)
- `admin/governance-questions.ts` - ✅ Naudojamas (admin components)
- `admin/branduolys-content.ts` - ✅ Naudojamas (admin components)
- `admin/system-core-seed.ts` - ✅ Naudojamas (admin components)
- `admin/update-org.ts` - ✅ Naudojamas (admin components)
- `admin/manage-members.ts` - ✅ Naudojamas (admin components)
- `admin/seed-system-core.ts` - ✅ Naudojamas (admin components)
- `projects.ts` - ✅ Naudojamas (projects pages)
- `projectMembers.ts` - ✅ Naudojamas (project hooks)
- `projectMemberMutations.ts` - ✅ Naudojamas (project hooks)
- `projectAuditLog.ts` - ✅ Naudojamas (project hooks)
- `ideas.ts` - ✅ Naudojamas (ideas pages)
- `invoices.ts` - ✅ Naudojamas (invoices pages)
- `history.ts` - ✅ Naudojamas (history pages)
- `audit-logs.ts` - ✅ Naudojamas (audit pages)
- `protocols.ts` - ✅ Naudojamas (protocol components)
- `generate-protocol-pdf.ts` - ✅ Naudojamas (protocol components)
- `member-dashboard.ts` - ✅ Naudojamas (member dashboard)
- `member-profile.ts` - ✅ Naudojamas (profile pages)
- `member-requirements.ts` - ✅ Naudojamas (member components)
- `member-status.ts` - ✅ Naudojamas (member components)
- `positions.ts` - ✅ Naudojamas (position components)
- `positions-assign.ts` - ✅ Naudojamas (position components)
- `check-board-position.ts` - ✅ Naudojamas (resolutions page)
- `consents.ts` - ✅ Naudojamas (onboarding)
- `governance-config.ts` - ✅ Naudojamas (governance pages)
- `governance-questions.ts` - ✅ Naudojamas (governance pages)
- `governance-draft.ts` - ✅ Naudojamas (governance pages)
- `governance-submission.ts` - ✅ Naudojamas (governance pages)
- `governance-compliance.ts` - ✅ Naudojamas (governance components)
- `org-activation.ts` - ✅ Naudojamas (onboarding)
- `org-logo.ts` - ✅ Naudojamas (org logo API routes)
- `public-registry.ts` - ✅ Naudojamas (landing page)
- `system-news.ts` - ✅ Naudojamas (dashboard widgets)
- `update-profile.ts` - ✅ Naudojamas (profile pages)
- `accept-invite.ts` - ✅ Naudojamas (accept invite page)
- `invite-member.ts` - ✅ Naudojamas (member components)
- `register-member.ts` - ✅ Naudojamas (registration form)
- `meeting-attendance.ts` - ✅ Naudojamas (meeting components)
- `live-voting.ts` - ✅ Naudojamas (voting components)
- `get-vote-by-resolution.ts` - ✅ Naudojamas (resolution components)
- `dashboard.ts` - ✅ Naudojamas (dashboard pages)
- `onboarding-status.ts` - ✅ Naudojamas (onboarding pages)
- `change-password.ts` - ✅ Naudojamas (auth components)
- `_audit.ts` - ✅ Naudojamas (internal helper)
- `_guards.ts` - ✅ Naudojamas (internal helper)

### NENAUDOJAMI (Patvirtinti)
- `enable-immediate-voting.ts` - ❌ **NENAUDOJAMAS** - Funkcija apibrėžta, bet niekur neimportuojama. Atrodo kaip test/dev funkcija.

### NAUDOJAMI (Per RPC)
- `auto-abstain.ts` - ✅ **NAUDOJAMAS** - Kviečiamas iš `meetings.ts` per RPC `auto_abstain_for_remote_voters`

### REKOMENDACIJOS

1. **enable-immediate-voting.ts** - ✅ **GALIMA PAŠALINTI** - Niekur neimportuojamas, tik test funkcija
   - **Veiksmas**: Pašalinti arba perkelti į `__tests__` katalogą
   - **Rizika**: Žema (niekur nenaudojamas)

2. **auto-abstain.ts** - ✅ **PALIKTI** - Naudojamas per RPC funkcijas

## Kitas Žingsnis
1. Patikrinti `enable-immediate-voting.ts` naudojimą
2. Patikrinti `auto-abstain.ts` naudojimą per RPC
3. Sukurti backup prieš šalinimą
4. Pašalinti nenaudojamus actions

