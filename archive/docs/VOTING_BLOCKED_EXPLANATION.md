# Balsavimo blokavimo paaiškinimas

## Klaida: `CAN_VOTE_BLOCKED`

Kai matote klaidą `CAN_VOTE_BLOCKED`, tai reiškia, kad `can_vote` governance funkcija blokavo jūsų balsavimą.

### Kaip veikia patikra:

1. **`can_cast_vote` funkcija** (SQL RPC) patikrina:
   - Ar balsavimas egzistuoja ir yra `OPEN`
   - Ar vartotojas turi aktyvią narystę
   - **Jei narys nėra OWNER**, kviečia `can_vote` funkciją (governance taisyklės)
   - Ar narys jau balsavo

2. **`can_vote` funkcija** (governance) patikrina:
   - Governance taisykles, kurios gali apriboti balsavimą
   - Pavyzdžiui:
     - Ar narys turi teisę balsuoti pagal governance konfigūraciją
     - Ar nėra kitų apribojimų (pvz., skolų, statusų)

### Galimos priežastys:

1. **Governance taisyklės blokuoja balsavimą**
   - Narys neturi teisės balsuoti pagal governance konfigūraciją
   - Pavyzdžiui: `can_vote` funkcija gali patikrinti:
     - Ar narys yra aktyvus
     - Ar narys neturi skolų (jei `Restrict Debtors` yra `block`)
     - Ar narys turi reikiamą statusą

2. **Narys nėra OWNER**
   - OWNER visada gali balsuoti (praleidžia `can_vote` patikrą)
   - Kiti nariai turi praeiti `can_vote` patikrą

### Kaip patikrinti:

1. **Patikrinkite, ar esate OWNER:**
   ```sql
   SELECT role FROM memberships 
   WHERE org_id = 'your-org-id' 
   AND user_id = auth.uid();
   ```

2. **Patikrinkite, ar yra `can_vote` funkcija:**
   ```sql
   SELECT EXISTS (
     SELECT 1 FROM information_schema.routines
     WHERE routine_schema = 'public'
       AND routine_name = 'can_vote'
   );
   ```

3. **Jei yra `can_vote` funkcija, patikrinkite jos logiką:**
   ```sql
   SELECT * FROM can_vote('your-org-id', auth.uid());
   ```

### Sprendimas:

1. **Jei esate OWNER ir vis tiek gaunate klaidą:**
   - Patikrinkite, ar `can_cast_vote` funkcija yra atnaujinta su OWNER praleidimu
   - Paleiskite `sql/fix_can_cast_vote_for_owner.sql` migraciją

2. **Jei esate MEMBER:**
   - Patikrinkite governance konfigūraciją
   - Patikrinkite, ar jūsų narystės statusas yra `ACTIVE`
   - Patikrinkite, ar nėra kitų apribojimų (skolos, statusai)

3. **Patikrinkite klaidos detales:**
   - UI dabar rodo `can_vote_reason` ir `can_vote_details`
   - Tai padės suprasti, kodėl balsavimas blokuojamas

