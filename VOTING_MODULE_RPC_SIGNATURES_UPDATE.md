# Balsavimo Modulio RPC Signatūrų Atnaujinimas

## Atnaujinta pagal EXACT RPC Signatūras iš Audito

### 1. can_cast_vote ✅

**RPC Signature:**
```sql
can_cast_vote(
  p_vote_id uuid,
  p_user_id uuid,
  p_channel vote_channel
) RETURNS TABLE(
  allowed boolean,
  reason text,
  details jsonb
)
```

**Server Action:**
```typescript
canCastVote(voteId: string, channel: VoteChannel = 'IN_PERSON')
```

**Call:**
```typescript
supabase.rpc('can_cast_vote', {
  p_vote_id: voteId,
  p_user_id: user.id,
  p_channel: channel, // Always passed explicitly
})
```

**Return Handling:**
- ✅ Returns `data?.[0]` (Supabase RPC returns array)
- ✅ Type: `CanCastVoteResult` with `details: Record<string, any>` (jsonb)

---

### 2. cast_vote ✅

**RPC Signature:**
```sql
cast_vote(
  p_vote_id uuid,
  p_choice vote_choice,
  p_channel vote_channel
) RETURNS TABLE(
  ok boolean,
  reason text
)
```

**Server Action:**
```typescript
castVote(input: CastVoteInput)
```

**Call:**
```typescript
supabase.rpc('cast_vote', {
  p_vote_id: input.vote_id,
  p_choice: input.choice,
  p_channel: channel, // Always passed explicitly, never null/undefined
})
```

**Return Handling:**
- ✅ Returns `data?.[0]` (Supabase RPC returns array)
- ✅ Type: `CastVoteResult` with `ok: boolean, reason: string`
- ✅ Note: `p_user_id` handled inside RPC via `auth.uid()`

---

### 3. close_vote ✅

**RPC Signature:**
```sql
close_vote(
  p_vote_id uuid
) RETURNS TABLE(
  ok boolean,
  reason text,
  votes_for int,
  votes_against int,
  votes_abstain int
)
```

**Server Action:**
```typescript
closeVote(voteId: string)
```

**Call:**
```typescript
supabase.rpc('close_vote', {
  p_vote_id: voteId,
})
```

**Return Handling:**
- ✅ Returns `data?.[0]` (Supabase RPC returns array)
- ✅ Type: `CloseVoteResult` with all vote counts

---

### 4. apply_vote_outcome ✅

**RPC Signature:**
```sql
apply_vote_outcome(
  p_vote_id uuid
) RETURNS TABLE(
  ok boolean,
  reason text,
  out_vote_id uuid,
  resolution_id uuid,
  outcome text,
  votes_for int,
  votes_against int,
  votes_abstain int,
  updated_rows int
)
```

**Server Action:**
```typescript
applyVoteOutcome(voteId: string)
```

**Call:**
```typescript
supabase.rpc('apply_vote_outcome', {
  p_vote_id: voteId,
})
```

**Return Handling:**
- ✅ Returns `data?.[0]` (Supabase RPC returns array)
- ✅ Type: `ApplyVoteOutcomeResult` with `outcome: string` (not union type, as it's text)

---

## Pakeitimai

### Server Actions (`src/app/actions/voting.ts`)

1. **canCastVote:**
   - ✅ Always passes `p_channel` explicitly
   - ✅ Returns `data?.[0]` (handles array return)
   - ✅ Updated comments with RPC signature

2. **castVote:**
   - ✅ Always passes `p_channel` explicitly (never null/undefined)
   - ✅ Returns `data?.[0]` (handles array return)
   - ✅ Updated comments: `p_user_id` handled inside RPC

3. **closeVote:**
   - ✅ Returns `data?.[0]` (handles array return)
   - ✅ Updated comments with RPC signature

4. **applyVoteOutcome:**
   - ✅ Returns `data?.[0]` (handles array return)
   - ✅ Updated comments with RPC signature

### Types (`src/lib/types/voting.ts`)

1. **CanCastVoteResult:**
   - ✅ `details: Record<string, any>` (jsonb - can contain any structure)
   - ✅ Updated comments with RPC return type

2. **CastVoteResult:**
   - ✅ Updated comments with RPC return type

3. **CloseVoteResult:**
   - ✅ Updated comments with RPC return type

4. **ApplyVoteOutcomeResult:**
   - ✅ `outcome: string` (not union type, as RPC returns text)
   - ✅ Updated comments with RPC return type

### UI Components (`src/components/voting/vote-form.tsx`)

1. **Preflight Check:**
   - ✅ Calls `can_cast_vote` before `cast_vote`
   - ✅ Shows `reason` and `details` from `can_cast_vote`
   - ✅ Always passes `p_channel` explicitly

2. **useEffect:**
   - ✅ Updated comment: "Preflight check"
   - ✅ Always passes `p_channel` explicitly

---

## ENUM Types

**Matching PostgreSQL ENUMs:**
- ✅ `VoteChoice = 'FOR' | 'AGAINST' | 'ABSTAIN'`
- ✅ `VoteChannel = 'IN_PERSON' | 'WRITTEN' | 'REMOTE'`

---

## Svarbu

1. **Supabase RPC returns array:** Visada naudoti `data?.[0]` arba `data?.[0] || data`
2. **p_channel always explicit:** Niekada neleisti `null` arba `undefined` - visada perduoti reikšmę
3. **Preflight check:** UI visada kviečia `can_cast_vote` prieš `cast_vote`
4. **Structured errors:** Visi RPC grąžina `reason` ir `details` - UI rodo žmogišką tekstą

---

## Testavimas

Patikrinkite, kad:
- ✅ Visi RPC kvietimai naudoja teisingus parametrų pavadinimus
- ✅ Visi RPC kvietimai tvarko array return (`data?.[0]`)
- ✅ `p_channel` visada perduodamas aiškiai (ne null/undefined)
- ✅ UI rodo `reason` ir `details` iš `can_cast_vote`

