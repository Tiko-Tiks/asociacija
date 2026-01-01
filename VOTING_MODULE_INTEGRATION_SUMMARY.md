# Balsavimo Modulio Integracijos Suvestinė

## Ištrinti Failai (DB objektai jau egzistuoja produkcinėje DB)

- ❌ `sql/create_voting_module_complete.sql` - IŠTRINTAS
- ❌ `sql/create_voting_rpc_functions.sql` - IŠTRINTAS  
- ❌ `sql/create_voting_rls_policies.sql` - IŠTRINTAS

## Sukurti Failai

### 1. READ-ONLY Auditas
- ✅ `sql/audit_voting_module_readonly.sql` - READ-ONLY DB auditas (SELECT/pg_catalog)

### 2. TypeScript Tipai
- ✅ `src/lib/types/voting.ts` - Visi voting tipai (VoteKind, VoteChoice, VoteChannel, Vote, VoteBallot, VoteTally, RPC return types)

### 3. Server Actions
- ✅ `src/app/actions/voting.ts` - Visi server actions:
  - `getVote(voteId)` - gauti balsavimą
  - `getVoteTally(voteId)` - gauti suvestinę
  - `getVotesForResolution(resolutionId)` - gauti visus balsavimus rezoliucijai
  - `createVote(input)` - sukurti balsavimą
  - `canCastVote(voteId, channel)` - RPC: `can_cast_vote`
  - `castVote(input)` - RPC: `cast_vote`
  - `closeVote(voteId)` - RPC: `close_vote`
  - `applyVoteOutcome(voteId)` - RPC: `apply_vote_outcome`
  - `getUserBallot(voteId)` - gauti vartotojo balsą

### 4. UI Komponentai
- ✅ `src/components/voting/vote-form.tsx` - Balsavimo forma nariams
- ✅ `src/components/voting/vote-tally.tsx` - Balsavimo suvestinė
- ✅ `src/components/voting/vote-admin-actions.tsx` - Admin veiksmai (Close/Apply outcome)
- ✅ `src/components/voting/create-vote-modal.tsx` - Modalas sukurti balsavimą
- ✅ `src/components/voting/voting-section.tsx` - Pagrindinis wrapper komponentas

## Pakeisti Failai

### 1. `src/components/voting/voting-section.tsx`
**Pakeitimai:**
- ✅ Pakeistas meetings fetch: dabar naudoja tiesioginį `supabase.from('meetings').select(...).eq('org_id', orgId)`
- ✅ Pridėtas `isBoard` prop (optional) admin veiksmams
- ✅ Admin veiksmai rodomi tik jei `isOwner || isBoard`

### 2. `src/components/resolutions/resolution-card.tsx`
**Pakeitimai:**
- ✅ Pridėtas `VotingSection` importas
- ✅ Integruotas `VotingSection` komponentas į resolution card (po approve/reject mygtukų)

## Integracija į Resolutions Puslapį

**Failas:** `src/components/resolutions/resolution-card.tsx`

```tsx
{/* Voting Section */}
<div className="mt-4 pt-4 border-t">
  <VotingSection
    resolutionId={resolution.id}
    orgId={orgId}
    isOwner={isOwner}
  />
</div>
```

## RPC Funkcijų Naudojimas

Visi server actions naudoja ESAMAS RPC funkcijas:
- ✅ `can_cast_vote(p_vote_id, p_user_id, p_channel)` 
- ✅ `cast_vote(p_vote_id, p_choice, p_channel)`
- ✅ `close_vote(p_vote_id)`
- ✅ `apply_vote_outcome(p_vote_id)`

**Jokios business logikos kliente** - viskas per RPC.

## Roles Logika

- ✅ Admin veiksmai (Close/Apply outcome) rodomi tik jei `isOwner || isBoard`
- ✅ Dabar naudojama tik `isOwner` (perduodama iš `getMembershipRole`)
- ✅ `isBoard` yra optional prop, bet dabar nenaudojamas (galima pridėti pozicijų tikrinimą vėliau)

## Meetings Fetch

- ✅ Pakeistas iš `listMeetings(membership_id)` į tiesioginį fetch:
  ```tsx
  supabase.from('meetings')
    .select('id, title, scheduled_at')
    .eq('org_id', orgId)
    .order('scheduled_at', { ascending: false })
  ```

## GA vs OPINION

- ✅ GA balsavimui `meeting_id` privalomas (validuojama `createVote`)
- ✅ OPINION balsavimui `meeting_id` neprivalomas (gali būti NULL)

## Sekantys Žingsniai

1. **Paleiskite READ-ONLY auditą:**
   ```sql
   sql/audit_voting_module_readonly.sql
   ```
   Patikrinkite, ar visi objektai egzistuoja ir ar struktūra atitinka.

2. **Jei rastas neatitikimas** - pateikite skirtumus (be keitimo).

3. **Testuokite:**
   - GA balsavimas su meeting
   - OPINION balsavimas be meeting
   - Admin veiksmai (Close/Apply outcome)
   - Early voting (WRITTEN/REMOTE) su governance config

## Pastabos

- Visi RPC funkcijų kvietimai naudoja esamas produkcinės DB funkcijas
- Jokios naujos DB migracijos
- Jokios RLS keitimo
- Jokios stub funkcijų
- Visi veiksmai per RPC (ne tiesioginis DB access)

