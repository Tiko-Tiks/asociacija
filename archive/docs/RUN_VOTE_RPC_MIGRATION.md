# VOTE RPC FUNKCIJŲ MIGRACIJA

## Problema
OWNER negali balsuoti rezoliucijų balsavime - gauna klaidą "Neturite teisės balsuoti".

## Sprendimas
Sukurti `can_cast_vote` RPC funkciją, kuri teisingai tikrina vartotojo teises balsuoti.

## Instrukcijos

1. **Atidarykite Supabase Dashboard** → SQL Editor

2. **Paleiskite SQL migraciją:**
   - Nukopijuokite visą `sql/create_vote_rpc_functions.sql` failo turinį
   - Įklijuokite į SQL Editor
   - Spauskite "Run"

3. **Patikrinkite, ar funkcijos sukurtos:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('can_cast_vote', 'cast_vote', 'close_vote', 'apply_vote_outcome');
```

Turėtumėte matyti 4 funkcijas.

## Funkcijų aprašymas

### 1. `can_cast_vote(p_vote_id, p_user_id, p_channel)`
- Tikrina ar vartotojas gali balsuoti
- Patikrina:
  - Ar balsavimas egzistuoja ir yra OPEN
  - Ar vartotojas turi aktyvią narystę
  - Ar vartotojas jau balsavo
  - Ar `can_vote` funkcija (governance rules) leidžia balsuoti

### 2. `cast_vote(p_vote_id, p_choice, p_channel)`
- Balsuoja rezoliucijos balsavime
- Leidžia keisti balsą (upsert)

### 3. `close_vote(p_vote_id)`
- Uždaro balsavimą (tik OWNER/BOARD)

### 4. `apply_vote_outcome(p_vote_id)`
- Taiko balsavimo rezultatą rezoliucijai (tik OWNER/BOARD)

## Svarbu

Jei `can_vote` funkcija (governance rules) neegzistuoja, `can_cast_vote` funkcija ją praleis ir leidžia balsuoti, jei vartotojas turi aktyvią narystę.

Jei `can_vote` funkcija egzistuoja ir blokuoja OWNER balsavimą, reikia patikrinti governance taisykles.

## Testavimas

Po migracijos bandykite balsuoti kaip OWNER. Jei vis dar gaunate klaidą, patikrinkite:
1. Ar vartotojas turi aktyvią narystę (`member_status = 'ACTIVE'`)
2. Ar `can_vote` funkcija neblokuoja balsavimo
3. Ar balsavimas yra OPEN status

