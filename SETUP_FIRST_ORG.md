# Sukurti Pirmą Organizaciją

Kad aplikacija veiktų, reikia sukurti organizaciją ir pridėti vartotoją kaip narys.

## Greitas Būdas (Rekomenduojama)

1. Atidarykite `setup_first_org.sql` failą projekto šakninėje
2. Pakeiskite `'your-email@example.com'` į savo el. paštą (kuriuo prisijungėte)
3. Nukopijuokite visą SQL kodą
4. Eikite į Supabase Dashboard → SQL Editor
5. Įklijuokite ir paleiskite (RUN)
6. Perkraukite aplikacijos puslapį

## Rankinis Būdas

Jei norite rankiniu būdu:

1. Eikite į Supabase Dashboard → SQL Editor
2. Gaukite savo user ID:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
   ```
3. Sukurkite organizaciją (su slug):
   ```sql
   INSERT INTO orgs (name, slug, created_at)
   VALUES ('Mano Bendruomenė', 'mano-bendruomene', NOW())
   RETURNING id;
   ```
4. Pridėkite save kaip OWNER (pakeiskite 'your-user-id' ir 'org-id'):
   ```sql
   INSERT INTO memberships (org_id, user_id, role, status)
   VALUES (
     'org-id',  -- Pakeiskite į organizacijos ID iš 3 žingsnio
     'your-user-id',  -- Pakeiskite į user ID iš 2 žingsnio
     'OWNER',
     'ACTIVE'
   );
   ```

## Po šių žingsnių

1. Perkraukite puslapį (F5 arba Ctrl+R)
2. Turėtumėte matyti savo organizaciją sidebar'e
3. Dashboard turėtų rodyti duomenis
