# FIX: OWNER negali balsuoti

## Problema
OWNER negali balsuoti rezoliucijų balsavime - gauna klaidą "Neturite teisės balsuoti".

## Priežastis
`can_cast_vote` funkcija kviečia `can_vote` funkciją (governance rules), kuri gali blokuoti OWNER balsavimą. OWNER turėtų visada turėti teisę balsuoti.

## Sprendimas
Atnaujinta `can_cast_vote` funkcija, kad OWNER praleistų `can_vote` patikrą.

## Instrukcijos

1. **Atidarykite Supabase Dashboard** → SQL Editor

2. **Paleiskite SQL migraciją:**
   - Nukopijuokite visą `sql/create_vote_rpc_functions.sql` failo turinį
   - Įklijuokite į SQL Editor
   - Spauskite "Run"

   ARBA

   - Nukopijuokite tik `sql/fix_can_cast_vote_for_owner.sql` turinį
   - Įklijuokite į SQL Editor
   - Spauskite "Run"

3. **Patikrinkite funkciją:**
```sql
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'can_cast_vote';
```

## Kas pakeista

- OWNER visada gali balsuoti (praleidžia `can_vote` patikrą)
- Kiti nariai (MEMBERS) vis dar turi praeiti `can_vote` patikrą
- Narystės patikra lieka ta pati (turi būti ACTIVE)

## Testavimas

Po migracijos bandykite balsuoti kaip OWNER. Jei vis dar gaunate klaidą, patikrinkite:
1. Ar vartotojas tikrai yra OWNER (`memberships.role = 'OWNER'`)
2. Ar narystė yra ACTIVE (`memberships.member_status = 'ACTIVE'`)
3. Ar balsavimas yra OPEN (`votes.status = 'OPEN'`)

