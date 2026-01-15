# Komponentų Analizė

## Tikslas
Identifikuoti, kurie komponentai tikrai naudojami ir kurie nenaudojami.

## Metodika
1. Rasti visus komponentų failus
2. Patikrinti, kur jie importuojami
3. Identifikuoti nenaudojamus
4. Sukurti ataskaitą

## Komponentų Sąrašas (148 failai)

### Admin (16 failų)
- `admin-dashboard-client.tsx`
- `ai-brain-monitor.tsx`
- `branduolys-management.tsx`
- `community-applications-list.tsx`
- `global-stats.tsx`
- `governance-questions-manager.tsx`
- `org-details-modal.tsx`
- `org-registry-table.tsx`
- `org-review-request-detail.tsx`
- `org-review-requests-list.tsx`
- `super-admin-dashboard.tsx`
- `system-broadcast.tsx`
- `system-core-seed.tsx`
- `test-user-management.tsx`
- `test-user-stats-widget.tsx`
- `user-organization-manager.tsx`

### Command Center (8 failų)
- `action-grid.tsx`
- `activity-feed.tsx`
- `ai-copilot-widget.tsx`
- `ai-placeholder.tsx`
- `command-center-content.tsx`
- `modern-dashboard.tsx`
- `monitoring-column.tsx`
- `quick-publish-modals.tsx`

### Dashboard (14 failų)
- `activity-feed.tsx`
- `assistant-widget.tsx`
- `breadcrumb-nav.tsx`
- `dashboard-client.tsx`
- `dashboard-header.tsx`
- `dashboard-layout-client.tsx`
- `dashboard-logo.tsx`
- `dashboard-skeleton.tsx`
- `header.tsx`
- `org-switcher.tsx`
- `quick-actions.tsx`
- `sidebar.tsx`
- `stat-card.tsx`
- `system-news-widget.tsx`

### Meetings (13 failų)
- `agenda-attachment-viewer.tsx`
- `agenda-builder.tsx`
- `agenda-initial-setup.tsx`
- `agenda-item-voting.tsx`
- `create-meeting-modal.tsx`
- `edit-meeting-form.tsx`
- `live-voting-simple.tsx`
- `live-voting-totals.tsx`
- `meeting-checkin-list.tsx`
- `meeting-view-for-members.tsx`
- `meeting-view.tsx`
- `published-meeting-card.tsx`
- `remote-voting-intent.tsx`

### Landing (10 failų)
- `definition-section-wrapper.tsx`
- `definition-section.tsx`
- `hero-section-wrapper.tsx`
- `hero-section.tsx`
- `landing-header.tsx`
- `legal-section-wrapper.tsx`
- `legal-section.tsx`
- `news-section.tsx`
- `process-section.tsx`
- `registry-section.tsx`

### Projects (8 failų)
- `create-project-client.tsx`
- `create-project-modal.tsx`
- `pledge-in-kind-form.tsx`
- `pledge-money-form.tsx`
- `pledge-work-form.tsx`
- `project-detail.tsx`
- `project-details-client.tsx`
- `projects-list-client.tsx`

### Onboarding (9 failų)
- `consent-document-viewer.tsx`
- `consents-step.tsx`
- `governance-step.tsx`
- `onboarding-blocker.tsx`
- `onboarding-continue-client.tsx`
- `onboarding-wizard.tsx`
- `password-setup.tsx`
- `readiness-checklist.tsx`
- `waiting-step.tsx`

### UI (31 failas)
- `ui/` katalogo komponentai (shadcn/ui)

### Kiti
- `audit/` (1 failas)
- `auth/` (3 failai)
- `dev/` (1 failas)
- `finance/` (1 failas)
- `governance/` (5 failų)
- `history/` (1 failas)
- `ideas/` (3 failai)
- `invoices/` (1 failas)
- `layout/` (1 failas)
- `member/` (6 failų)
- `members/` (3 failai)
- `organization/` (1 failas)
- `profile/` (1 failas)
- `protocols/` (2 failai)
- `public/` (5 failų)
- `resolutions/` (4 failai)
- `simple-votes/` (0 failų - tuščias katalogas!)
- `voting/` (3 failai)

## Analizės Rezultatai

### NENAUDOJAMI (Patvirtinti)
- `simple-votes/` - ❌ **TUŠČIAS KATALOGAS** - Galima pašalinti
- `breadcrumb-nav.tsx` - ❌ **NENAUDOJAMAS** - Komponentas apibrėžtas, bet niekur neimportuojamas
- `assistant-widget.tsx` - ⚠️ **REIKIA PATIKRINTI** - Komponentas apibrėžtas, bet reikia patikrinti ar naudojamas
- `ai-placeholder.tsx` - ⚠️ **REIKIA PATIKRINTI** - Komponentas apibrėžtas, bet reikia patikrinti ar naudojamas

### NAUDOJAMI (Patvirtinti)
- `ai-brain-monitor.tsx` - ✅ Naudojamas (super-admin-dashboard)
- `modern-dashboard.tsx` - ✅ Naudojamas (command-center-content)
- `dashboard-skeleton.tsx` - ✅ Naudojamas (dashboard page)

### REKOMENDACIJOS

1. **simple-votes/** - ✅ **GALIMA PAŠALINTI** - Tuščias katalogas
   - **Veiksmas**: Pašalinti katalogą
   - **Rizika**: Žema (tuščias)

2. **breadcrumb-nav.tsx** - ✅ **GALIMA PAŠALINTI** - Niekur neimportuojamas
   - **Veiksmas**: Pašalinti failą
   - **Rizika**: Žema (niekur nenaudojamas)

3. **assistant-widget.tsx** - ⚠️ **REIKIA PATIKRINTI** - Komponentas apibrėžtas, bet reikia patikrinti ar naudojamas
   - **Veiksmas**: Patikrinti ar naudojamas, jei ne - pašalinti

4. **ai-placeholder.tsx** - ⚠️ **REIKIA PATIKRINTI** - Komponentas apibrėžtas, bet reikia patikrinti ar naudojamas
   - **Veiksmas**: Patikrinti ar naudojamas, jei ne - pašalinti

## Kitas Žingsnis
1. Patikrinti `assistant-widget.tsx` naudojimą
2. Patikrinti `ai-placeholder.tsx` naudojimą
3. Pašalinti `simple-votes/` katalogą
4. Pašalinti `breadcrumb-nav.tsx` failą

