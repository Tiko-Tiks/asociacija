# BALSAVIMO (VOTING) FLOW – v19.0 (Governance Aligned)

**I DALIS — BALSAVIMO (VOTING) FLOW v19.0**

(Governance Layer–Aligned Redakcija)

**Versija:** v19.0  
**Statusas:** Governance-Aligned / Schema-Safe  
**Pakeitimų pobūdis:** semantinis, nefunkcinis  
**Suderinamumas:** Governance Layer v19.0 (Code Freeze)

---

## 0. PASKIRTIS

Šis dokumentas apibrėžia balsavimo procedūras Branduolys sistemoje, nekurdamas sprendimų, o registruodamas ir procedūriškai užrakindamas sprendimus, priimtus pagal:

- Physical Primacy,
- Constitution First,
- External Guardian principus.

**GA (General Assembly) nėra balsavimo tipas.**  
**GA yra procedūra, kurioje balsavimas yra viena stadija.**

---

## 1. BALSAVIMO TIPAI

Sistema palaiko du balsavimo režimus:

### 1.1 GA (General Assembly – HARD MODE)

Procedūrinis režimas, taikomas tik susirinkimams, kuriems galioja įstatai.

GA režime:

- galioja procedūriniai užraktai,
- naudojamas governance snapshot,
- taikoma kvorumo ir dokumentų patikra.

### 1.2 OPINION

Neprocedūriniai, informaciniai balsavimai:

- neturi teisinės galios,
- nenaudoja governance snapshot,
- netaiko kvorumo.

---

## 2. GA HARD MODE (v19.0)

GA HARD MODE yra procedūrinis užraktas, kuris riboja, kaip gali būti naudojamas balsavimo modulis GA kontekste.

### 2.1 Draudimai (privalomi)

GA režime DRAUDŽIAMA:

- **Individualus IN_PERSON balsavimas**
  → visada HARD ERROR

- **Dvigubas dalyvavimas**
  → techninis blokavimas

- **Governance parametrų keitimas po publikavimo**
  → naudojamas tik snapshot

### 2.2 Leidžiami kanalai

| Kanalas | OPINION | GA |
|---------|---------|-----|
| REMOTE | ✅ | ✅ |
| WRITTEN | ✅ | ✅ |
| IN_PERSON (individualus) | ✅ | ❌ |
| IN_PERSON (agreguotas) | – | ✅ |

---

## 3. GOVERNANCE SNAPSHOT (v19.0)

### 3.1 Snapshot paskirtis

Publikuojant GA susirinkimą, visi procedūriniai parametrai užfiksuojami ir nekinta:

- kvorumas
- early voting dienos
- procedūrinių klausimų rinkinys

### 3.2 Saugojimo vieta (v19.0)

Snapshot nėra struktūrinis DB laukas.

Jis saugomas tik kaip:

```
meetings.metadata.governance_snapshot
```

Tai leidžia:

- išlaikyti schema freeze,
- audituoti kilmę,
- naudoti RPC ir VIEW be migracijų.

---

## 4. PROCEDŪRINIAI KLAUSIMAI (v19.0 SEMANTIKA)

Procedūriniai darbotvarkės klausimai (1–3):

1. Darbotvarkės tvirtinimas
2. Susirinkimo pirmininko tvirtinimas
3. Susirinkimo sekretoriaus tvirtinimas

### 4.1 Statusas

Šie klausimai yra:

- procedūriniai įrašai,
- ne bendruomenės iniciatyvos sprendimai,
- privalomi pagal įstatus.

Sistema jų nekuria kaip sprendimų, o registruoja kaip procedūros stadijas.

**Reikalavimas:**

- jų aprašyme privalo būti aiškus žymėjimas
- „Procedūrinis klausimas pagal įstatus"

---

## 5. BALSAVIMO ETAPAI (nepakitę)

1. Sukūrimas
2. Atidarymas
3. Nuotolinis / rašytinis balsavimas
4. Gyvas balsavimas (tik agreguotas)
5. Uždarymas
6. Rezultatų taikymas

(Procesinė logika lieka tokia pati kaip v18.8)

---

## 6. GYVAS BALSAVIMAS – FAKTŲ IR INDIKATORIŲ ATSKYRIMAS

### 6.1 Faktiniai duomenys (fact.*)

Žmogaus įvedami (tik šie du):

- `fact.live_against`
- `fact.live_abstain`

### 6.2 Išvestiniai rodikliai (indicator.*)

Sistema apskaičiuoja arba gauna iš kitų šaltinių:

- `indicator.live_present` – gaunamas iš `meeting_attendance` (IN_PERSON present=true skaičiavimas)
- `indicator.live_for` – apskaičiuojamas kaip (live_present - live_against - live_abstain)

**Pastaba:** `live_present` yra išvestinis rodiklis (indicator), nes jis gaunamas iš `meeting_attendance` lentelės, o ne žmogaus įvedamas tiesiogiai.

**Tai nėra faktai ir neturi savarankiškos teisinės galios.**

---

## 7. REZULTATŲ TAIKYMAS

### 7.1 TEST režimas

- leidžiama užbaigti be kvorumo,
- `resolutions.status` nekeičiamas,
- UI privalo rodyti įspėjimą.

### 7.2 PRODUCTION režimas

Privaloma:

- pasiektas kvorumas,
- pasirašytas protokolas (PDF).

Tik tada leidžiama keisti `resolutions.status`.

Po pakeitimo – immutability.

---

## 8. SAUGUMAS IR AUDITAS

- Jokio dvigubo dalyvavimo
- Jokio individualaus gyvo balsavimo GA
- Jokio sprendimų keitimo po APPROVED
- Visi veiksmai – audit_logs

---

## 9. SKIRTUMAS: GA vs OPINION (v19)

(esmė nepasikeitė, tik terminija)

---

**Dokumento pabaiga**
