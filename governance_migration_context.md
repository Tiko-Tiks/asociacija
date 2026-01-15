# Governance & Migration Context – Bendruomenių Branduolys v20.0+

**Schema:** Code Freeze v19.0 – NO ALTER TABLE, NO new columns/tables, NO DROP (išskyrus vienkartines migracijos funkcijas).

**Plėtra tik per:** metadata jsonb su prefix'ais:
- fact.* (faktiniai duomenys)
- indicator.* (runtime rodikliai)
- project.* (projektai, tag, phase, budget)
- ui.*, template.*, ai.* (ne teisiniai)

**Draudžiama:**
- Keisti APPROVED resolutions metadata
- Dubliuoti struktūrinius laukus (title, status, created_at, org_id...)
- Naudoti metadata be prefix'o
- Pridėti stulpelius (pvz., metadata į meeting_attendance – neegzistuoja)

**Migracija užbaigta (sėkmingai):**
- projects (3) → resolutions.metadata (DRAFT legacy nutarimai su project.* prefix'ais)
- ideas (2) → resolutions.metadata (DRAFT legacy nutarimai su project.* prefix'ais)
- meeting_attendance → legacy, read-only view (be schema pakeitimų)
- **Iš viso: 5 DRAFT legacy nutarimų** (3 projektai + 2 idėjos)
- Visi duomenys (tag, phase, budget.planned) saugomi project.* ir indicator.* prefix'ais

**Aktyvios apsaugos:**
- validate_metadata trigger'is ant resolutions – blokuoja neteisingus prefix'us ir APPROVED pakeitimus

**RPC funkcijos:**
- rpc_get_legacy_summary(p_org_id uuid) → json summary (total_legacy: 5, projects: 3, ideas: 2, total_planned_eur: 0.00, avg_progress: 0, unique_phases: 4)
- rpc_get_legacy_resolutions(p_org_id uuid, p_limit int, p_offset int) → TABLE su legacy resolutions
- rpc_get_meeting_summary(p_org_id uuid) → json summary iš meeting_attendance

**View'ai:**
- legacy_meeting_attendance_summary – read-only view legacy meeting_attendance duomenims

**Svarbiausios išvados:**
- ✅ Governance Layer schema (v19.0) – **užrakinta (Code Freeze)**
- ✅ Nuo šiol jokio grįžimo prie v17.0 / v18.x struktūros
- ✅ Visa tolimesnė plėtra ir nauji duomenys – tik per metadata jsonb su privalomais prefix'ais

**Rekomendacijos:**
- Peržiūrėkite naujus DRAFT legacy nutarimus platformoje
- Jei reikia pataisyti / patvirtinti – sukurkite naują nutarimą su reference į legacy
- Nuo šiol visus naujus projektus registruokite tik kaip nutarimus su project.* metadata

**Visada:**
- SECURITY DEFINER RPC'ams
- COALESCE null'ams
- TG_OP = 'UPDATE' prieš OLD patikrinime
- prefix tik su subraktu (project.tag, ne project)
