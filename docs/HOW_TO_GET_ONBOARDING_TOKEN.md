# Kaip Gauti Onboarding Token

Po V2 bendruomenės registracijos, token gali būti gautas dviem būdais:

## Būdas 1: El. laiškas (Rekomenduojama)

### Ką tikėtis:
Po sėkmingos registracijos gausite **el. laišką** su nuoroda:

```
Sveiki!

Jūsų paraiška priimta. Norėdami tęsti registraciją, paspauskite ant nuorodos:

http://localhost:3000/onboarding/continue?token=ABC123XYZ...

Arba naudokite šį token: ABC123XYZ...
```

### Jei negavote el. laiško:
1. **Patikrinkite spam/junk aplanką**
2. **Patikrinkite el. pašto konfigūraciją** (development aplinkoje el. laiškai gali būti ne išsiunčiami)
3. **Patikrinkite serverio logus** - ar el. laiškas išsiųstas

## Būdas 2: Tiesiogiai iš duomenų bazės

Jei negavote el. laiško arba testuojate, token gali būti paimtas tiesiogiai iš DB:

### SQL užklausa:

```sql
-- Raskite paskutinę paraišką pagal el. paštą
SELECT 
  id,
  community_name,
  email,
  token,
  token_expires_at,
  status,
  created_at
FROM community_applications
WHERE email = 'jūsų-test-email@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

### Rezultatas:
```
id: uuid
community_name: "Test Bendruomenė"
email: "test@example.com"
token: "ABC123XYZ..."  <-- ŠITAS JŪSŲ TOKEN
token_expires_at: "2024-12-31T23:59:59Z"
status: "PENDING"
created_at: "2024-01-01T12:00:00Z"
```

### Naudojimas:
Kopijuokite `token` reikšmę ir naudokite:
```
http://localhost:3000/onboarding/continue?token=ABC123XYZ...
```

## Būdas 3: Supabase Dashboard

Jei naudojate Supabase:

1. Atidarykite Supabase Dashboard
2. Eikite į **Table Editor** → **community_applications**
3. Raskite savo paraišką (pagal email arba created_at)
4. Kopijuokite `token` reikšmę

## Būdas 4: Serverio Logai (Development)

Jei testuojate development aplinkoje, patikrinkite serverio logus:

```bash
# Terminale, kur paleistas `npm run dev`
# Ieškokite:
"Token generated: ..."
"Onboarding link: ..."
```

## Patikrinimas: Ar Token Galioja?

Token galioja **30 dienų** nuo sukūrimo.

### Patikrinimas SQL:
```sql
SELECT 
  token,
  token_expires_at,
  CASE 
    WHEN token_expires_at > NOW() THEN 'VALID'
    ELSE 'EXPIRED'
  END as status
FROM community_applications
WHERE email = 'jūsų-test-email@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

### Jei Token Expyrintas:
1. Pateikite naują paraišką
2. Arba rankiniu būdu atnaujinkite `token_expires_at` DB (tik testavimui!)

## V2 Onboarding Start (Tiesioginis API)

Jei turite token, galite tiesiogiai naudoti V2 API:

```bash
curl -X POST http://localhost:3000/api/v2/onboarding/start \
  -H "Content-Type: application/json" \
  -d '{"token":"jūsų-token-čia"}'
```

Arba naudokite Postman / Insomnia / Thunder Client.

## Troubleshooting

### Problema: Token nerandamas DB
**Sprendimas**: Patikrinkite, ar registracija tikrai sėkminga. Patikrinkite `community_applications` lentelę.

### Problema: Token expyrintas
**Sprendimas**: Pateikite naują paraišką arba rankiniu būdu atnaujinkite `token_expires_at`.

### Problema: El. laiškas negaunamas
**Sprendimas**: 
- Development: Patikrinkite el. pašto konfigūraciją (gali būti console.log vietoj tikro siuntimo)
- Production: Patikrinkite el. pašto serviso logus

### Problema: Token neveikia
**Sprendimas**: 
- Patikrinkite, ar token nėra expyrintas
- Patikrinkite, ar `status` yra `'PENDING'` arba `'IN_PROGRESS'`
- Patikrinkite, ar token formatas teisingas (base64url)

## Greitas Testavimo Scenarijus

1. **Registruokite bendruomenę**: `/register-community-v2`
2. **Gaukite token iš DB**:
   ```sql
   SELECT token FROM community_applications 
   WHERE email = 'test@example.com' 
   ORDER BY created_at DESC LIMIT 1;
   ```
3. **Naudokite token**:
   ```
   http://localhost:3000/onboarding/continue?token=<token>
   ```
4. **Arba tiesiogiai API**:
   ```bash
   POST /api/v2/onboarding/start
   {"token": "<token>"}
   ```
