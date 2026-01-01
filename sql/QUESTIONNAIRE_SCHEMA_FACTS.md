# Klausimyno Schemos Faktai (READ-ONLY)

## Lentelių Sąrašas

### 1. `governance_questions`
**Stulpelių sąrašas reikia patvirtinti**, bet pagal kodą turėtų būti:
- `id` (UUID, NOT NULL) - PRIMARY KEY
- `question_key` (TEXT) - unikalus klausimo raktas
- `question_text` (TEXT) - klausimo tekstas
- `question_type` (TEXT) - 'radio' | 'checkbox' | 'text' | 'number'
- `section` (TEXT) - sekcijos pavadinimas
- `section_order` (INTEGER) - tvarka sekcijoje
- `is_required` (BOOLEAN) - ar privalomas
- `is_active` (BOOLEAN) - ar aktyvus
- `options` (JSONB) - variantų masyvas `[{value: string, label: string}]`
- `depends_on` (TEXT, nullable) - nuo kurio klausimo priklauso
- `depends_value` (TEXT, nullable) - kokią reikšmę turi turėti
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ, nullable)

**SVARBU**: Nėra `org_id` - klausimai yra **globalūs** (visoms organizacijoms)
**SVARBU**: Nėra `version_id` - nėra atskiros versijų sistemos

### 2. `governance_configs`
**Tikslus stulpelių sąrašas:**
- `id` (UUID, NOT NULL) - PRIMARY KEY
- `org_id` (UUID, NOT NULL) - FOREIGN KEY → orgs
- `answers` (JSONB, NOT NULL) - atsakymų objektas `{question_key: answer_value}`
- `active_config` (JSONB, nullable) - aktyvios konfigūracijos žymė
- `proposed_config` (JSONB, nullable) - siūloma konfigūracija
- `proposed_at` (TIMESTAMPTZ, nullable) - kada pasiūlyta
- `proposed_by` (UUID, nullable) - kas pasiūlė
- `status` (TEXT, NOT NULL) - konfigūracijos statusas
- `updated_at` (TIMESTAMPTZ, nullable)

**SVARBU**: Nėra `version_id` - nėra atskiros versijų sistemos

## Atsakymai į Klausimus

### 1. Kokie yra lentelių pavadinimai? (4-6 lentelės maksimaliai)

**DABAR EGZISTUOJA (2 lentelės):**
1. `governance_questions` - klausimai (globalūs)
2. `governance_configs` - atsakymai ir konfigūracijos (org-specific)

**NĖRA (bet gali būti reikalingos):**
3. ❌ `questionnaire_versions` - versijų lentelė
4. ❌ `questionnaire_options` - variantų lentelė (dabar JSONB `governance_questions.options`)
5. ❌ `questionnaire_answers` - atsakymų lentelė (dabar JSONB `governance_configs.answers`)
6. ❌ `questionnaire_assignments` - org assignment lentelė (dabar tiesioginis `org_id`)

### 2. Kiekvienai iš jų: 3-6 svarbiausi stulpeliai (pavadinimas + tipas)

#### `governance_questions`:
1. `id` (UUID) - PRIMARY KEY
2. `question_key` (TEXT) - unikalus raktas
3. `question_text` (TEXT) - klausimo tekstas
4. `question_type` (TEXT) - tipas (radio/checkbox/text/number)
5. `is_required` (BOOLEAN) - ar privalomas
6. `is_active` (BOOLEAN) - ar aktyvus
7. `options` (JSONB) - variantai

#### `governance_configs`:
1. `id` (UUID) - PRIMARY KEY
2. `org_id` (UUID) - organizacijos ID
3. `answers` (JSONB) - atsakymai
4. `active_config` (JSONB) - aktyvios versijos žymė
5. `proposed_config` (JSONB) - siūloma konfigūracija
6. `status` (TEXT) - konfigūracijos statusas

### 3. Kaip laikote atsakymą: jsonb viename lauke ar tipizuoti laukai?

**Atsakymas: JSONB viename lauke**

- `governance_configs.answers` - JSONB laukas
- Saugoma struktūra: `{question_key: answer_value}`
- Pvz.: `{"has_board": true, "track_fees": true, "quorum_percentage": 50}`

**Nėra tipizuotų laukų** (value_text, value_int, value_jsonb, etc.)

### 4. Ar yra "active version per org" mechanizmas? (taip/ne, ir kur fiksuojama)

**Atsakymas: TAIP**

**Kur fiksuojama:**
- `governance_configs.active_config` (JSONB, nullable)
- `governance_configs.proposed_config` (JSONB, nullable)
- `governance_configs.status` (TEXT, NOT NULL)

**Mechanizmas:**
- `active_config` - aktyvios konfigūracijos žymė (gali būti JSONB objektas arba boolean)
- `proposed_config` - siūloma konfigūracija (laukia patvirtinimo)
- `status` - konfigūracijos statusas (pvz., 'ACTIVE', 'PROPOSED', 'PENDING')

**SVARBU**: Nėra atskiros `version_id` - versijų sistema realizuota per `active_config` / `proposed_config` mechanizmą.

## Išvados

1. **Lentelių skaičius**: 2 lentelės (governance_questions + governance_configs)
2. **Atsakymų saugojimas**: JSONB viename lauke (`governance_configs.answers`)
3. **Versijų sistema**: Nėra atskiros versijų lentelės, bet yra `active_config` / `proposed_config` mechanizmas
4. **Org assignment**: Tiesioginis `org_id` ryšys, nėra atskiros assignment lentelės
5. **Options**: Saugomi JSONB `governance_questions.options`, nėra atskiros options lentelės

