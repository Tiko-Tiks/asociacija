# GA Protokolų Modulio Finalizacija

## ✅ Atlikti Pakeitimai

### 1. Quorum Source of Truth ✅

**Failas:** `sql/create_protocol_rpc_functions.sql` - `build_meeting_protocol_snapshot`

**Pakeitimai:**
- ❌ Pašalintas manual quorum calculation fallback
- ✅ Privalomas `meeting_quorum_status(meeting_id)` function
- ✅ Jei funkcija neegzistuoja → grąžina `error: 'QUORUM_FUNCTION_MISSING'`

**Kodas:**
```sql
-- 3) Quorum
-- REQUIRE meeting_quorum_status function (source of truth)
SELECT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name = 'meeting_quorum_status'
) INTO v_quorum_function_exists;

IF NOT v_quorum_function_exists THEN
  -- Quorum function is required - return error
  RETURN jsonb_build_object('error', 'QUORUM_FUNCTION_MISSING');
END IF;

-- Use meeting_quorum_status (source of truth)
SELECT to_jsonb(q.*) INTO v_quorum
FROM public.meeting_quorum_status(p_meeting_id) q;
```

### 2. finalize_meeting_protocol - apply_vote_outcome BEFORE snapshot ✅

**Failas:** `sql/create_protocol_rpc_functions.sql` - `finalize_meeting_protocol`

**Pakeitimai:**
- ✅ Privalomas `apply_vote_outcome` function check
- ✅ Kiekvienam agenda item su resolution_id:
  - Randa GA vote: `(meeting_id, resolution_id, kind='GA')`
  - Reikalauja `vote.status='CLOSED'`
  - **KVIEČIA `apply_vote_outcome(vote_id)` PIRMIAUSIAI** (prieš snapshot)
- ✅ Snapshot atspindi atnaujintą resolution status (APPROVED) ir adopted_at/by

**Kodas:**
```sql
-- Check if apply_vote_outcome function exists (required)
IF NOT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name = 'apply_vote_outcome'
) THEN
  RETURN QUERY SELECT 
    false, 
    'APPLY_VOTE_OUTCOME_FUNCTION_MISSING'::TEXT,
    NULL::UUID, NULL::INT, NULL::TEXT, NULL::TEXT;
  RETURN;
END IF;

-- For each agenda item with resolution_id:
FOR v_agenda_item IN
  SELECT * FROM public.meeting_agenda_items
  WHERE meeting_id = p_meeting_id
  AND resolution_id IS NOT NULL
LOOP
  -- Find GA vote by (meeting_id, resolution_id, kind='GA')
  SELECT * INTO v_vote
  FROM public.votes
  WHERE kind = 'GA'
  AND meeting_id = p_meeting_id
  AND resolution_id = v_agenda_item.resolution_id
  LIMIT 1;
  
  -- Require vote.status='CLOSED'
  IF v_vote.status != 'CLOSED' THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_CLOSED: ...', ...;
    RETURN;
  END IF;
  
  -- MUST call apply_vote_outcome BEFORE building snapshot
  SELECT * INTO v_apply_result
  FROM public.apply_vote_outcome(v_vote.id);
END LOOP;

-- Build snapshot AFTER applying all vote outcomes
-- Snapshot will reflect updated resolution status (APPROVED) and adopted_at/by
v_snapshot := public.build_meeting_protocol_snapshot(p_meeting_id);
```

### 3. No Custom Pass/Fail Logic ✅

**Patvirtinta:**
- ✅ Snapshot tik atspindi esamą balsavimo modulio logiką
- ✅ Quorum iš `meeting_quorum_status` (source of truth)
- ✅ Resolution status iš `apply_vote_outcome` rezultato
- ✅ Tallies iš `vote_tallies` view
- ✅ Jokių custom pass/fail logikos

### 4. Error Handling ✅

**Pakeitimai:**
- ✅ `preview_meeting_protocol` patikrina snapshot error
- ✅ `finalize_meeting_protocol` patikrina snapshot error
- ✅ Aiškūs error reason'ai: `QUORUM_FUNCTION_MISSING`, `APPLY_VOTE_OUTCOME_FUNCTION_MISSING`, `VOTE_NOT_CLOSED`

## 📋 Veikimo Principas

### Finalizavimo Eiliškumas:

1. **Validacijos:**
   - Meeting exists, GA type
   - User is OWNER/BOARD
   - `meeting_quorum_status` function exists
   - `apply_vote_outcome` function exists

2. **Vote Validation & Outcome Application:**
   - Kiekvienam agenda item su resolution_id:
     - Randa GA vote
     - Patikrina vote.status='CLOSED'
     - **KVIEČIA `apply_vote_outcome(vote_id)`** ← atnaujina resolution status

3. **Snapshot Build:**
   - `build_meeting_protocol_snapshot()` surenka:
     - Meeting meta
     - Attendance summary
     - **Quorum iš `meeting_quorum_status(meeting_id)`** (source of truth)
     - Agenda su resolution status (jau atnaujintas per apply_vote_outcome)
     - Vote tallies iš `vote_tallies` view

4. **Protocol Creation:**
   - snapshot_hash = sha256(snapshot::text)
   - status='FINAL'
   - version = max(version)+1

## ✅ Rezultatas

- ✅ Quorum source of truth: `meeting_quorum_status(meeting_id)` (privalomas)
- ✅ `apply_vote_outcome` kviečiamas PIRMIAUSIAI (prieš snapshot)
- ✅ Snapshot atspindi atnaujintą resolution status (APPROVED) ir adopted_at/by
- ✅ Jokių custom pass/fail logikos - tik mirror'ina esamą balsavimo modulį

---

**Status:** ✅ Finalizacija atlikta pagal reikalavimus!

