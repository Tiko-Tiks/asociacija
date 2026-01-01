# Klausimyno Schemos Suvestinė

## Lentelių Sąrašas

### 1. `governance_questions`
**Tikslus stulpelių sąrašas reikia patvirtinti**, bet pagal kodą turėtų būti:
- `id` (UUID, PRIMARY KEY)
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

### 2. `governance_configs`
**Tikslus stulpelių sąrašas reikia patvirtinti**, bet pagal kodą turėtų būti:
- `id` (UUID, PRIMARY KEY)
- `org_id` (UUID, FOREIGN KEY → orgs) - organizacijos ID
- `answers` (JSONB) - atsakymų objektas `{question_key: answer_value}`
- `active_config` (JSONB, nullable) - aktyvios konfigūracijos žymė
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ, nullable)

## Atsakymų Saugojimas

**Būdas**: **JSONB viename lauke**

- `governance_configs.answers` - JSONB laukas
- Saugoma struktūra: `{question_key: answer_value}`
- Pvz.: `{"has_board": true, "track_fees": true, "quorum_percentage": 50}`

**Nėra tipizuotų laukų** (value_text, value_int, etc.)

## Versijų Mechanizmas

### ❌ Nėra Versijų Lentelės
- Nėra `questionnaire_versions` lentelės
- Nėra `governance_versions` lentelės
- Nėra `versions` lentelės

### ❌ Nėra version_id
- `governance_questions.version_id` - **NE**
- `governance_configs.version_id` - **NE**

### ✅ Yra "Active Version Per Org" Mechanizmas
- `governance_configs.active_config` - **TAIP**
- Naudojamas kaip žymė, kuri konfigūracija yra aktyvi organizacijai
- Gali būti JSONB objektas arba boolean

## Org Assignment

### ❌ Nėra Atskiros Assignment Lentelės
- Nėra `questionnaire_assignments` lentelės
- Nėra `org_assignments` lentelės

### ✅ Tiesioginis Org Assignment
- `governance_configs.org_id` - tiesioginis ryšys su organizacija
- Kiekviena organizacija turi savo `governance_configs` įrašą

## Lentelių Sąrašas (4-6 lentelės)

**DABAR EGZISTUOJA:**
1. `governance_questions` - klausimai (globalūs)
2. `governance_configs` - atsakymai (org-specific)

**NĖRA (bet gali būti reikalingos):**
3. ❌ `questionnaire_versions` - versijos
4. ❌ `questionnaire_options` - variantai (dabar JSONB `governance_questions.options`)
5. ❌ `questionnaire_answers` - atsakymai (dabar JSONB `governance_configs.answers`)
6. ❌ `questionnaire_assignments` - org assignment (dabar tiesioginis `org_id`)

## Svarbiausi Stulpeliai

### governance_questions
- `id` (UUID)
- `question_key` (TEXT) - unikalus raktas
- `question_text` (TEXT)
- `question_type` (TEXT)
- `is_required` (BOOLEAN)
- `is_active` (BOOLEAN)
- `options` (JSONB) - variantai

### governance_configs
- `id` (UUID)
- `org_id` (UUID) - organizacijos ID
- `answers` (JSONB) - atsakymai
- `active_config` (JSONB) - aktyvios versijos žymė

## Išvados

1. **Lentelių skaičius**: 2 lentelės (governance_questions + governance_configs)
2. **Atsakymų saugojimas**: JSONB viename lauke (`governance_configs.answers`)
3. **Versijų sistema**: Nėra atskiros versijų lentelės, bet yra `active_config` mechanizmas
4. **Org assignment**: Tiesioginis `org_id` ryšys, nėra atskiros assignment lentelės
5. **Options**: Saugomi JSONB `governance_questions.options`, nėra atskiros options lentelės

