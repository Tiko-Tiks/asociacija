# Paprastas Balsavimas (Simple Vote / Poll) Modulis - Sukūrimo Suvestinė

## 📋 Apžvalga

Sukurtas pilnas "Paprastas balsavimas" modulis su:
- **Paprastas poll** - be kvorumo, be susirinkimo, nepririštas prie resolutions
- **Balsavimas** - FOR/AGAINST/ABSTAIN
- **Suvestinė** - real-time tallies
- **Priedai** - optional file attachments

## 🗄️ Duomenų Bazės Struktūra

### 1. Vote Choice Enum

**Failas:** `sql/create_simple_vote_module.sql`

Sukuria `vote_choice` enum (jei neegzistuoja):
- `FOR`
- `AGAINST`
- `ABSTAIN`

### 2. Lentelės

#### `simple_votes`
- `id` UUID PK
- `org_id` UUID FK → orgs
- `title` TEXT NOT NULL
- `summary` TEXT
- `details` TEXT
- `status` TEXT NOT NULL DEFAULT 'OPEN' (OPEN/CLOSED)
- `opens_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `closes_at` TIMESTAMPTZ (optional)
- `closed_at` TIMESTAMPTZ
- `created_by` UUID
- `created_at` TIMESTAMPTZ

**Indeksai:**
- `(org_id)`
- `(org_id, status)`
- `(created_at DESC)`

#### `simple_vote_ballots`
- `id` UUID PK
- `vote_id` UUID FK → simple_votes
- `membership_id` UUID FK → memberships
- `choice` vote_choice NOT NULL
- `cast_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

**Constraints:**
- `UNIQUE (vote_id, membership_id)` - vienas balsas per narystę

#### `simple_vote_attachments` (optional MVP)
- `id` UUID PK
- `vote_id` UUID FK → simple_votes
- `storage_bucket` TEXT DEFAULT 'vote-documents'
- `storage_path` TEXT NOT NULL
- `file_name` TEXT NOT NULL
- `mime_type` TEXT
- `size_bytes` BIGINT
- `uploaded_by` UUID
- `uploaded_at` TIMESTAMPTZ

### 3. View

**`simple_vote_tallies`** - suvestinė:
- `vote_id`
- `votes_for` INT
- `votes_against` INT
- `votes_abstain` INT
- `votes_total` INT
- `unique_voters` INT

## 🔧 RPC Funkcijos

**Failas:** `sql/create_simple_vote_rpc_functions.sql`

### 1) `can_cast_simple_vote(p_vote_id, p_user_id)`
- Tikrina ar vartotojas gali balsuoti
- Patikrina: vote.status = OPEN, ACTIVE membership, can_vote (jei egzistuoja)
- Grąžina: `allowed`, `reason`, `details`

### 2) `cast_simple_vote(p_vote_id, p_choice)`
- Balsuoja (upsert per ON CONFLICT)
- Reikalauja auth.uid()
- Preflight: can_cast_simple_vote

### 3) `close_simple_vote(p_vote_id)`
- Uždaro balsavimą (tik OWNER/BOARD)
- Grąžina tallies

### 4) `create_simple_vote(p_org_id, p_title, p_summary, p_details, p_closes_at)`
- Sukuria balsavimą (tik OWNER/BOARD)

### 5) `attach_simple_vote_file_metadata(p_vote_id, p_storage_path, p_file_name, ...)`
- Prideda priedo metaduomenis (tik OWNER/BOARD)

## 🔒 RLS Policies

**Failas:** `sql/create_simple_vote_rls_policies.sql`

### simple_votes:
- **MEMBERS:** SELECT tik savo org, tik status OPEN/CLOSED
- **OWNER/BOARD:** CRUD savo org

### simple_vote_ballots:
- **MEMBERS:** INSERT/UPDATE tik savo membership_id ir tik jei vote OPEN
- **MEMBERS:** SELECT tik savo org
- **OWNER/BOARD:** SELECT viską savo org (auditui)

### simple_vote_attachments:
- **MEMBERS:** SELECT tik jei vote priklauso org
- **OWNER/BOARD:** CRUD savo org

## 🎨 Server Actions

**Failas:** `src/app/actions/simple-votes.ts`

### List & Get:
- `listSimpleVotes(orgId)` - list votes
- `getSimpleVote(voteId)` - get single vote
- `getSimpleVoteTally(voteId)` - get tally

### Voting:
- `canCastSimpleVote(voteId)` - check if can vote
- `castSimpleVote(voteId, choice)` - cast vote

### Admin:
- `createSimpleVote(orgId, payload)` - create vote
- `closeSimpleVote(voteId)` - close vote

### Attachments:
- `getSimpleVoteAttachments(voteId)` - get attachments
- `attachSimpleVoteFileMetadata(...)` - attach file metadata
- `getSimpleVoteAttachmentSignedUrl(attachmentId)` - signed URL (1h)

## 🖼️ UI Komponentai

### 1. Simple Votes List
**Failas:** `src/components/simple-votes/simple-votes-list.tsx`

- OPEN balsavimai viršuje
- CLOSED balsavimai apačioje
- Rodo kiek balsavo (tallies)
- Create mygtukas (OWNER/BOARD)

### 2. Create Simple Vote Modal
**Failas:** `src/components/simple-votes/create-simple-vote-modal.tsx`

- Forma: title, summary, details, closes_at
- Create (RPC `create_simple_vote`)

### 3. Simple Vote Detail
**Failas:** `src/components/simple-votes/simple-vote-detail.tsx`

- Vote info: title, summary, details, attachments
- Balsavimo forma: FOR/AGAINST/ABSTAIN (tik OPEN)
- Preflight: can_cast_simple_vote + aiškus reason
- Suvestinė: UŽ/PRIEŠ/SUSILAIKĖ + kiek balsavo
- Admin: Close vote mygtukas (OWNER/BOARD)

## 🔗 Integracija su can_vote

**Failas:** `sql/create_simple_vote_rpc_functions.sql` (can_cast_simple_vote)

- Jei `can_vote(org_id, user_id)` egzistuoja → kviečia ir gerbia rezultatą
- Jei `can_vote.allowed = false` → blokuoja balsavimą
- Reason: `CAN_VOTE_BLOCKED` + can_vote reason/details

## 📦 Supabase Storage

- **Bucket:** `vote-documents` (rekomenduojama private)
- **Path format:** `org/{orgId}/votes/{voteId}/file.pdf`
- **Signed URLs:** generuojamos per `getSimpleVoteAttachmentSignedUrl()` (1h validity)

## ✅ Testavimo Scenarijai

### 1) OWNER sukuria balsavimą, MEMBER mato OPEN
- ✅ OWNER sukuria per Create modal
- ✅ MEMBER mato OPEN balsavimą list'e

### 2) MEMBER balsuoja, suvestinė atsinaujina
- ✅ MEMBER balsuoja FOR/AGAINST/ABSTAIN
- ✅ Suvestinė atsinaujina real-time

### 3) OWNER uždaro, status=CLOSED, suvestinė lieka
- ✅ OWNER uždaro per Close mygtuką
- ✅ Status = CLOSED
- ✅ Suvestinė lieka matoma

### 4) Jei can_vote blokuoja → can_cast_simple_vote grąžina allowed=false
- ✅ Jei can_vote(org_id, user_id) egzistuoja ir allowed=false
- ✅ can_cast_simple_vote grąžina allowed=false, reason=CAN_VOTE_BLOCKED

### 5) Priedai: admin įkelia, narys gali parsisiųsti
- ✅ Admin upload meta per attach_simple_vote_file_metadata
- ✅ Narys gali gauti signed URL ir atsisiųsti

## 📝 Migracijos Eiliškumas

1. **Pirmiausia:** `sql/audit_simple_vote_module_readonly.sql` - READ-ONLY auditas
2. **Tada:** `sql/create_simple_vote_module.sql` - lentelės, view, enum
3. **Tada:** `sql/create_simple_vote_rpc_functions.sql` - RPC funkcijos
4. **Galiausiai:** `sql/create_simple_vote_rls_policies.sql` - RLS policies

## 🎯 Svarbu

- ✅ Visi veiksmai per RPC, kliente – tik UI
- ✅ Nelieskite GA/OPINION DB objektų
- ✅ Naudoja esamą `vote_choice` enum (FOR/AGAINST/ABSTAIN)
- ✅ Integruojasi su esamu `can_vote` (jei egzistuoja)
- ✅ RLS nerašyti "aplinkui"; naudoja auth.uid() ir membership patikras

## 📚 Failų Sąrašas

### SQL:
- `sql/audit_simple_vote_module_readonly.sql` - READ-ONLY auditas
- `sql/create_simple_vote_module.sql` - lentelės, view, enum
- `sql/create_simple_vote_rpc_functions.sql` - RPC funkcijos
- `sql/create_simple_vote_rls_policies.sql` - RLS policies

### Server Actions:
- `src/app/actions/simple-votes.ts` - visi simple vote server actions

### UI Komponentai:
- `src/components/simple-votes/simple-votes-list.tsx` - votes list
- `src/components/simple-votes/create-simple-vote-modal.tsx` - create modal
- `src/components/simple-votes/simple-vote-detail.tsx` - vote detail + voting form

---

**Status:** ✅ Modulis sukurtas ir paruoštas testavimui!

