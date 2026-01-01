# Balsavimo Modulio Įdiegimo Dokumentacija

## Apžvalga

Balsavimo modulis suteikia galimybę organizacijoms balsuoti dėl rezoliucijų dviem būdais:
1. **GA (Visuotinis Susirinkimas)** - reikalauja kvorumo ir susirinkimo dalyvavimo
2. **OPINION (Nuomonės Apklausa)** - kvorumo nereikia, bet rezultatas veda į RECOMMENDED

## DB Struktūra

### Migracijos Eiliškumas

1. **Pirmiausia paleiskite DB struktūros migracijas:**
   ```sql
   -- 1. Sukuria ENUM'us, lenteles, view
   sql/create_voting_module_complete.sql
   
   -- 2. Sukuria RPC funkcijas
   sql/create_voting_rpc_functions.sql
   
   -- 3. Sukuria RLS policies
   sql/create_voting_rls_policies.sql
   ```

2. **Patikrinkite, ar viskas sukurtas:**
   ```sql
   sql/audit_voting_module_db.sql
   ```

### Sukurtos Lentelės

- `public.votes` - balsavimo sesijos
- `public.vote_ballots` - individualūs balsai
- `public.vote_tallies` (VIEW) - balsavimo suvestinė

### Papildytos Lentelės

- `public.meeting_attendance` - pridėtas `mode` stulpelis (vote_channel)
- `public.resolutions` - pridėti `recommended_at`, `recommended_by`, status CHECK papildytas su 'RECOMMENDED'

## RPC Funkcijos

### 1. `get_membership_id(p_org_id, p_user_id)`
Grąžina aktyvią narystę pagal org+user.

### 2. `can_cast_vote(p_vote_id, p_user_id, p_channel)`
Tikrina, ar vartotojas gali balsuoti:
- GA: reikalauja meeting attendance, early_voting leidimo (jei WRITTEN/REMOTE)
- OPINION: užtenka ACTIVE membership

### 3. `cast_vote(p_vote_id, p_choice, p_channel)`
Balsuoja - UPSERT į vote_ballots.

### 4. `close_vote(p_vote_id)`
Uždaroma balsavimo sesija.

### 5. `approve_resolution_if_passed(p_vote_id)`
GA flow: tikrina kvorumą ir 2/3 taisyklę, tada kviečia `approve_resolution`.

### 6. `apply_vote_outcome(p_vote_id)`
Pritaiko balsavimo rezultatą:
- GA → APPROVED (per `approve_resolution`)
- OPINION → RECOMMENDED (tiesioginis UPDATE)

## TypeScript Tipai

Visi tipai apibrėžti `src/lib/types/voting.ts`:
- `VoteKind`, `VoteChoice`, `VoteChannel`
- `Vote`, `VoteBallot`, `VoteTally`
- RPC funkcijų return tipai

## Server Actions

Visi server actions `src/app/actions/voting.ts`:
- `getVote(voteId)`
- `getVoteTally(voteId)`
- `getVotesForResolution(resolutionId)`
- `createVote(input)`
- `canCastVote(voteId, channel)`
- `castVote(input)`
- `closeVote(voteId)`
- `applyVoteOutcome(voteId)`
- `getUserBallot(voteId)`

## UI Komponentai

### 1. `VoteForm` (`src/components/voting/vote-form.tsx`)
Balsavimo forma nariams:
- Pasirinkimas: FOR/AGAINST/ABSTAIN
- Kanalas: IN_PERSON/WRITTEN/REMOTE (GA atveju)
- Automatinis `can_cast_vote` patikrinimas

### 2. `VoteTally` (`src/components/voting/vote-tally.tsx`)
Balsavimo suvestinė:
- UŽ/PRIEŠ/SUSILAIKĖ skaičiai
- 2/3 taisyklės rezultatas
- Unikalių balsuotojų skaičius

### 3. `VoteAdminActions` (`src/components/voting/vote-admin-actions.tsx`)
Admin veiksmai:
- "Uždaryti balsavimą" (OPEN → CLOSED)
- "Pritaikyti rezultatą" (CLOSED → APPROVED/RECOMMENDED)

### 4. `CreateVoteModal` (`src/components/voting/create-vote-modal.tsx`)
Modalas sukurti balsavimą:
- Pasirinkimas: GA arba OPINION
- Meeting pasirinkimas (GA atveju)

### 5. `VotingSection` (`src/components/voting/voting-section.tsx`)
Pagrindinis wrapper komponentas, kuris sujungia visus komponentus.

## Integracija į Resolutions Puslapį

Pridėkite `VotingSection` į resolution card arba atskirą puslapį:

```tsx
import { VotingSection } from '@/components/voting/voting-section'

// Resolution card arba detail puslapyje:
<VotingSection 
  resolutionId={resolution.id} 
  orgId={orgId}
  isOwner={isOwner}
/>
```

## Governance Konfigūracija

Balsavimo modulis naudoja `governance_configs.answers->>'early_voting'`:
- `allow_written` - leidžia raštu balsuoti
- `allow_remote` - leidžia nuotoliu balsuoti
- `allow_all` - leidžia abu
- `not_applicable` - neleidžia išankstinio balsavimo

## 2/3 Taisyklė

Kvalifikuota dauguma: `3 × FOR ≥ 2 × (FOR + AGAINST)`

ABSTAIN neskaičiuojamas į vardiklį.

## Testavimas

### GA Testas:
1. Sukurkite GA vote su meeting_id
2. Narys su attendance.present=true gali balsuoti IN_PERSON
3. WRITTEN/REMOTE leidžiama tik jei early_voting leidžia ir attendance.mode sutampa
4. close_vote + apply_vote_outcome → rezoliucija tampa APPROVED

### OPINION Testas:
1. Sukurkite OPINION vote (be meeting)
2. Balsuoja ACTIVE nariai
3. close_vote + apply_vote_outcome → rezoliucija tampa RECOMMENDED

## Priklausomybės

Balsavimo modulis priklauso nuo:
- `meeting_quorum_status(meeting_id)` - kvorumo tikrinimas (optional)
- `can_vote(org_id, user_id)` - skolų tikrinimas (optional)
- `approve_resolution(resolution_id)` - rezoliucijos patvirtinimas (required for GA)

Jei šios funkcijos neegzistuoja, RPC funkcijos automatiškai praleidžia atitinkamus patikrinimus.

## RLS Policies

Visi RLS policies sukurti `sql/create_voting_rls_policies.sql`:
- Users can read votes from their orgs
- OWNER/ADMIN can create/update votes
- Users can cast votes (via RPC)
- Platform admins can manage all votes/ballots

## Klaidos ir Reason Kodai

Visi reason kodai apibrėžti komponentuose:
- `VOTE_NOT_FOUND`
- `VOTE_NOT_OPEN`
- `NO_ACTIVE_MEMBERSHIP`
- `CAN_VOTE_BLOCKED`
- `GA_REQUIRES_MEETING`
- `NOT_PRESENT_IN_MEETING`
- `CHANNEL_MISMATCH`
- `EARLY_VOTING_NOT_ALLOWED`
- `QUORUM_NOT_MET`
- `2_3_RULE_NOT_MET`
- `RESOLUTION_ALREADY_APPROVED`

## Sekantys Žingsniai

1. **Paleiskite migracijas** (jei dar nepadaryta)
2. **Integruokite `VotingSection`** į resolutions puslapį
3. **Patikrinkite governance konfigūraciją** - early_voting klausimas turi egzistuoti
4. **Testuokite GA ir OPINION srautus**
5. **Pridėkite protokolo snapshot** (jei reikia)

## Pastabos

- Visi balsavimo veiksmai eina per RPC funkcijas (ne tiesioginis DB access)
- `apply_vote_outcome` yra `SECURITY DEFINER` - veikia net su RLS apribojimais
- Balsavimo rezultatai skaičiuojami tiesiai iš `vote_ballots` (ne tik iš view)
- Vienas aktyvus balsavimas vienai rezoliucijai (unique constraint)

