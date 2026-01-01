# Balsavimo Modulio Testavimo Scenarijai

## Testavimo Reikalavimai

### Prieš testavimą:
1. Turėti aktyvią organizaciją (ACTIVE status + ACTIVE ruleset)
2. Turėti 2 vartotojus:
   - OWNER/BOARD (sukurti/uždaryti/pritaikyti)
   - MEMBER (balsuoti)
3. GA testui: sukurti meeting ir meeting_attendance

---

## SCENARIJUS 1: OPINION → RECOMMENDED

### Tikslas: Patikrinti, ar OPINION balsavimas tinkamai keičia rezoliucijos statusą į RECOMMENDED.

### Žingsniai:

#### 1. Sukurti rezoliuciją
```
1. Prisijunkite kaip OWNER
2. Eikite į /dashboard/[slug]/resolutions
3. Spauskite "Sukurti sprendimą"
4. Užpildykite:
   - Pavadinimas: "Test OPINION balsavimas"
   - Turinys: "Test rezoliucija"
   - Statusas: PROPOSED
5. Spauskite "Sukurti"
```

#### 2. Sukurti OPINION balsavimą
```
1. Resolution card'e matysite "Sukurti balsavimą" mygtuką
2. Spauskite jį
3. Pasirinkite "OPINION (Nuomonės Apklausa)"
4. NEPASIRINKITE meeting (OPINION nereikalauja)
5. Spauskite "Sukurti"
6. ✅ Patikrinkite: Balsavimas sukurtas, status = OPEN
```

#### 3. Balsuoti (kaip MEMBER)
```
1. Prisijunkite kaip MEMBER (ne OWNER/BOARD)
2. Eikite į tą pačią rezoliuciją
3. Matysite balsavimo formą:
   - Pasirinkimas: FOR/AGAINST/ABSTAIN
   - Kanalas: Tik "Gyvai" (IN_PERSON) - OPINION default
4. Pasirinkite: FOR
5. Spauskite "Balsuoti"
6. ✅ Patikrinkite: Balsas užregistruotas, suvestinė atnaujinta
```

#### 4. Uždaryti balsavimą (kaip OWNER/BOARD)
```
1. Prisijunkite kaip OWNER/BOARD
2. Matysite "Uždaryti balsavimą" mygtuką
3. Spauskite jį
4. ✅ Patikrinkite:
   - Balsavimas uždarytas (status = CLOSED)
   - Suvestinė rodo balsus
   - Matysite "Pritaikyti rezultatą" mygtuką
```

#### 5. Pritaikyti rezultatą
```
1. Spauskite "Pritaikyti rezultatą"
2. ✅ Tikėtinas rezultatas:
   - Jei 2/3 taisyklė praėjo (3×FOR ≥ 2×(FOR+AGAINST)):
     - Rezoliucijos statusas = RECOMMENDED ✅
     - recommended_at užpildytas ✅
     - recommended_by užpildytas ✅
   - Jei nepraėjo:
     - Rezoliucijos statusas lieka nepakitęs
     - Klaidos pranešimas "2_3_RULE_NOT_MET"
```

#### 6. Patikrinti rezultatą
```
1. Atnaujinkite puslapį (F5)
2. ✅ Patikrinkite:
   - Rezoliucijos statusas = RECOMMENDED
   - Resolution card rodo "Rekomenduota" badge
   - Balsavimo suvestinė rodo uždarytą balsavimą
```

---

## SCENARIJUS 2: GA → APPROVED

### Tikslas: Patikrinti, ar GA balsavimas su meeting tinkamai keičia rezoliucijos statusą į APPROVED.

### Prieš testavimą:

#### 1. Sukurti meeting
```
1. Prisijunkite kaip OWNER
2. Eikite į governance/susirinkimai
3. Sukurkite naują susirinkimą:
   - Pavadinimas: "Test susirinkimas"
   - Data: šiandien arba ateityje
4. Išsaugokite
```

#### 2. Sukurti meeting_attendance
```
1. Prisijunkite kaip MEMBER
2. Eikite į meeting
3. Pažymėkite dalyvavimą:
   - present = true
   - mode = 'WRITTEN' (jei norite testuoti WRITTEN kanalą)
```

#### 3. Patikrinti governance config
```
1. Patikrinkite governance_configs.answers->>'early_voting':
   - Turi būti: 'allow_written', 'allow_remote', arba 'allow_all'
   - Jei 'not_applicable' - early voting neleidžiamas
```

### Žingsniai:

#### 1. Sukurti rezoliuciją
```
1. Prisijunkite kaip OWNER
2. Sukurkite naują rezoliuciją (PROPOSED status)
```

#### 2. Sukurti GA balsavimą
```
1. Resolution card'e spauskite "Sukurti balsavimą"
2. Pasirinkite "GA (Visuotinis Susirinkimas)"
3. PASIRINKITE meeting (privaloma)
4. Spauskite "Sukurti"
5. ✅ Patikrinkite: Balsavimas sukurtas, status = OPEN, meeting_id užpildytas
```

#### 3. Balsuoti WRITTEN kanalu (kaip MEMBER)
```
1. Prisijunkite kaip MEMBER su meeting_attendance (present=true, mode='WRITTEN')
2. Eikite į rezoliuciją
3. Matysite balsavimo formą:
   - Pasirinkimas: FOR/AGAINST/ABSTAIN
   - Kanalas: "Gyvai", "Raštu", "Nuotoliu"
4. ✅ Patikrinkite kanalų būseną:
   - "Gyvai" (IN_PERSON): enabled (jei present=true)
   - "Raštu" (WRITTEN): 
     - enabled (jei early_voting leidžia WRITTEN IR mode='WRITTEN')
     - disabled (jei neleidžia) + rodo reason
   - "Nuotoliu" (REMOTE):
     - enabled (jei early_voting leidžia REMOTE IR mode='REMOTE')
     - disabled (jei neleidžia) + rodo reason
5. Pasirinkite kanalą "Raštu" (jei enabled)
6. Pasirinkite: FOR
7. Spauskite "Balsuoti"
8. ✅ Patikrinkite: Balsas užregistruotas, channel='WRITTEN'
```

#### 4. Patikrinti kvorumą
```
1. Prisijunkite kaip OWNER/BOARD
2. Matysite suvestinę
3. ✅ Patikrinkite:
   - meeting_quorum_status(meeting_id) grąžina quorum_met = true
   - Jei ne - balsavimas negali būti patvirtintas
```

#### 5. Uždaryti balsavimą
```
1. Spauskite "Uždaryti balsavimą"
2. ✅ Patikrinkite:
   - Balsavimas uždarytas (status = CLOSED)
   - Suvestinė rodo balsus
```

#### 6. Pritaikyti rezultatą
```
1. Spauskite "Pritaikyti rezultatą"
2. ✅ Tikėtinas rezultatas:
   - Jei kvorumas pasiektas IR 2/3 taisyklė praėjo:
     - Rezoliucijos statusas = APPROVED ✅
     - adopted_at užpildytas ✅
     - adopted_by užpildytas ✅
   - Jei kvorumas nepasiektas:
     - Klaidos pranešimas "QUORUM_NOT_MET"
   - Jei 2/3 taisyklė nepraėjo:
     - Klaidos pranešimas "2_3_RULE_NOT_MET"
```

#### 7. Patikrinti rezultatą
```
1. Atnaujinkite puslapį (F5)
2. ✅ Patikrinkite:
   - Rezoliucijos statusas = APPROVED
   - Resolution card rodo "Patvirtintas" badge
   - Balsavimo suvestinė rodo uždarytą balsavimą
```

---

## Klaidos Scenarijai

### 1. Bandymas sukurti balsavimą be teisės
```
1. Prisijunkite kaip MEMBER (ne OWNER/BOARD)
2. Bandykite sukurti balsavimą
3. ✅ Tikėtinas rezultatas:
   - UI neturi "Sukurti balsavimą" mygtuko
   - Jei bandyti per API → RLS blokuoja
   - Server action grąžina: "RLS klaida: Neturite teisės..."
```

### 2. Bandymas balsuoti be teisės
```
1. Kaip MEMBER be meeting_attendance (GA atveju)
2. Bandykite balsuoti
3. ✅ Tikėtinas rezultatas:
   - can_cast_vote grąžina allowed = false
   - Reason: "NOT_PRESENT_IN_MEETING"
   - UI rodo klaidos pranešimą
```

### 3. Bandymas balsuoti WRITTEN be leidimo
```
1. Kaip MEMBER su meeting_attendance, bet early_voting='not_applicable'
2. Bandykite pasirinkti "Raštu"
3. ✅ Tikėtinas rezultatas:
   - "Raštu" disabled
   - Rodo reason: "EARLY_VOTING_NOT_ALLOWED"
```

---

## Performance Patikrinimas

### 1. VotingSection ne spam'ina DB
```
1. Atidarykite rezoliuciją su balsavimu
2. ✅ Patikrinkite:
   - Duomenys kraunami tik vieną kartą (loadData)
   - Nėra automatinio refresh (tik "Atnaujinti" mygtukas)
   - Po veiksmų (cast/close/apply) - tik tada refetch
```

### 2. Refresh mygtukas
```
1. Matysite "Atnaujinti" mygtuką (OWNER/BOARD)
2. Spauskite jį
3. ✅ Patikrinkite:
   - Duomenys atnaujinami
   - Vote, tally, resolution status atnaujinti
```

---

## Checklist

### OPINION Testas:
- [ ] Rezoliucija sukurta
- [ ] OPINION balsavimas sukurtas (be meeting)
- [ ] Balsuota (FOR/AGAINST/ABSTAIN)
- [ ] Balsavimas uždarytas
- [ ] Rezultatas pritaikytas
- [ ] Rezoliucijos statusas = RECOMMENDED (jei praėjo)
- [ ] recommended_at/recommended_by užpildyti

### GA Testas:
- [ ] Meeting sukurtas
- [ ] meeting_attendance sukurtas (present=true, mode=WRITTEN)
- [ ] governance_config early_voting leidžia WRITTEN
- [ ] Rezoliucija sukurta
- [ ] GA balsavimas sukurtas (su meeting)
- [ ] Balsuota WRITTEN kanalu
- [ ] Kanalas enabled/disabled pagal can_cast_vote
- [ ] Kvorumas pasiektas
- [ ] Balsavimas uždarytas
- [ ] Rezultatas pritaikytas
- [ ] Rezoliucijos statusas = APPROVED (jei praėjo)
- [ ] adopted_at/adopted_by užpildyti

### Klaidos:
- [ ] Create vote be teisės → RLS klaida
- [ ] Balsavimas be teisės → can_cast_vote reason
- [ ] WRITTEN be leidimo → disabled + reason

### Performance:
- [ ] VotingSection ne spam'ina DB
- [ ] Refresh mygtukas veikia
- [ ] Duomenys atnaujinami tik po veiksmų

