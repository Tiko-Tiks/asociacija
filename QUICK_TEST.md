# Greitas Vercel Email Testavimas

## Kaip įvesti duomenis

### Variantas 1: Interaktyvus (paprasčiausias)

1. **Atidarykite PowerShell terminalą** (ne Cursor terminale, bet atskirame PowerShell lange)

2. **Eikite į projekto katalogą:**
   ```powershell
   cd C:\Users\Administrator\Branduolys
   ```

3. **Paleiskite script'ą:**
   ```powershell
   .\auto-test-vercel.ps1
   ```

4. **Script'as paklaus duomenų:**
   ```
   Įveskite Vercel deployment URL (pvz.: https://asociacija.vercel.app):
   ```
   → **Įveskite URL ir paspauskite Enter**

   ```
   Įveskite el. pašto adresą, į kurį siųsti test email:
   ```
   → **Įveskite email ir paspauskite Enter**

5. **Script'as automatiškai testuos ir parodys rezultatus**

---

### Variantas 2: Su parametrais (jei žinote URL ir email)

**PowerShell terminale:**

```powershell
.\test-vercel-production.ps1 -Url "https://asociacija.vercel.app" -Email "your-email@example.com"
```

**Pakeiskite:**
- `https://asociacija.vercel.app` → jūsų tikras Vercel URL
- `your-email@example.com` → jūsų tikras email adresas

---

## Kur rasti Vercel URL?

1. **Vercel Dashboard:**
   - Eikite į: https://vercel.com/dashboard
   - Pasirinkite projektą
   - URL bus rodomas deployment sąraše

2. **Arba pagal projekto pavadinimą:**
   - Jei projektas vadinasi "asociacija"
   - URL gali būti: `https://asociacija.vercel.app`

---

## Pavyzdys

```powershell
# PowerShell terminale
cd C:\Users\Administrator\Branduolys
.\test-vercel-production.ps1 -Url "https://asociacija.vercel.app" -Email "test@gmail.com"
```

Script'as:
1. Patikrina API pasiekiamumą
2. Siunčia test email
3. Rodo rezultatus
4. Pateikia troubleshooting patarimus, jei reikia

---

## Troubleshooting

Jei kyla problemų:
- Patikrinkite, ar Vercel Environment Variables nustatyti
- Patikrinkite, ar Supabase secrets nustatyti
- Patikrinkite Vercel Function logs
- Patikrinkite Supabase Edge Function logs

