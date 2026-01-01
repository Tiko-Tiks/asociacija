-- ==================================================
-- VALDYMO NUSTATYMAI (Governance klausimynas) — V2
-- ==================================================
-- Visi "Taip/Ne" klausimai kaip radio (ne checkbox)
-- Skaičiai saugomi kaip JSON number (ne string)
-- Datos kaip date picker (ISO date)
-- Visur naudoti terminą "aktyvūs nariai (pagal aktyvių narių sąrašą)"
-- ==================================================
-- UPSERT pagal question_key (unikalus)
-- ==================================================

-- First, add 'date' type to question_type CHECK constraint
DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'governance_questions_question_type_check'
    AND conrelid = 'public.governance_questions'::regclass
  ) THEN
    ALTER TABLE public.governance_questions 
    DROP CONSTRAINT governance_questions_question_type_check;
  END IF;
END $$;

-- Add the new constraint with 'date' type included
ALTER TABLE public.governance_questions
ADD CONSTRAINT governance_questions_question_type_check
CHECK (question_type IN ('radio', 'checkbox', 'text', 'number', 'date'));

-- ==================================================
-- NOW UPDATE QUESTIONS
-- ==================================================

-- ==================================================
-- SKYRIUS 1. Narystė ir rolės
-- ==================================================

-- 1. new_member_approval
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'new_member_approval',
  'Kaip tvirtinate naujų narių priėmimą į bendruomenę?',
  'radio',
  'Narystė ir rolės',
  10,
  true,
  true,
  '[
    {"label": "Automatiškai (be tvirtinimo)", "value": "auto"},
    {"label": "Tvirtina pirmininkas", "value": "chairman"},
    {"label": "Tvirtina valdyba", "value": "board"},
    {"label": "Tvirtina administratorius", "value": "admin"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 2. has_board (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'has_board',
  'Ar bendruomenėje sudaryta valdyba?',
  'radio',
  'Narystė ir rolės',
  20,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 3. has_auditor (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'has_auditor',
  'Ar bendruomenėje yra revizorius / auditorius?',
  'radio',
  'Narystė ir rolės',
  30,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 4. board_quorum_percentage (number, tik jei has_board = yes)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'board_quorum_percentage',
  'Koks minimalus valdybos kvorumas sprendimams priimti? (%)',
  'number',
  'Narystė ir rolės',
  40,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 5. chairman_term_start_date (date)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'chairman_term_start_date',
  'Nuo kada prasidėjo (arba prasidės) dabartinio pirmininko kadencija?',
  'date',
  'Narystė ir rolės',
  50,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 6. chairman_term_duration_years (number)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'chairman_term_duration_years',
  'Kiek metų trunka pirmininko kadencija pagal įstatus?',
  'number',
  'Narystė ir rolės',
  60,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 7. council_elected_with_chairman (radio: Taip/Ne, tik jei has_board = yes)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'council_elected_with_chairman',
  'Ar valdyba (taryba) renkama tai pačiai kadencijai kartu su pirmininku?',
  'radio',
  'Narystė ir rolės',
  70,
  false,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 2. Mokesčiai ir skolos
-- ==================================================

-- 8. track_fees (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'track_fees',
  'Ar platformoje vedate nario mokesčių apskaitą (įmokos / skolos)?',
  'radio',
  'Mokesčiai ir skolos',
  100,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 9. fee_deadline_days (number, tik jei track_fees = yes)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'fee_deadline_days',
  'Po kiek dienų nuo nustatyto termino narys laikomas įsiskolinusiu? (d.)',
  'number',
  'Mokesčiai ir skolos',
  110,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 10. restrict_debtors (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'restrict_debtors',
  'Kaip elgtis, jei narys turi įsiskolinimą?',
  'radio',
  'Mokesčiai ir skolos',
  120,
  true,
  true,
  '[
    {"label": "Blokuoti balsavimą, kol skola nepadengta", "value": "block_vote"},
    {"label": "Leisti balsuoti, bet rodyti įspėjimą", "value": "warning_only"},
    {"label": "Netaikoma (skolos nenaudojamos kaip kriterijus)", "value": "not_applicable"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 3. Visuotinis susirinkimas (GA)
-- ==================================================

-- 11. meeting_notice_days (number)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'meeting_notice_days',
  'Minimalus pranešimo terminas iki visuotinio susirinkimo (dienomis).',
  'number',
  'Visuotinis susirinkimas (GA)',
  200,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 12. ga_quorum_percent (number)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'ga_quorum_percent',
  'Koks visuotinio susirinkimo kvorumas? (%) Procentais nuo aktyvių narių (pagal aktyvių narių sąrašą).',
  'number',
  'Visuotinis susirinkimas (GA)',
  210,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 13. ga_repeat_meeting_allowed (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'ga_repeat_meeting_allowed',
  'Jei pirmasis susirinkimas neįvyksta dėl kvorumo – ar leidžiamas pakartotinis susirinkimas?',
  'radio',
  'Visuotinis susirinkimas (GA)',
  220,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 14. ga_repeat_notice_days (number, tik jei ga_repeat_meeting_allowed = yes)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'ga_repeat_notice_days',
  'Pakartotinis susirinkimas: prieš kiek dienų jį reikia paskelbti? (d.)',
  'number',
  'Visuotinis susirinkimas (GA)',
  230,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 15. ga_repeat_quorum_percent (number, tik jei ga_repeat_meeting_allowed = yes)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'ga_repeat_quorum_percent',
  'Pakartotinis susirinkimas: koks kvorumas jam taikomas? (%) Procentais nuo aktyvių narių (pagal aktyvių narių sąrašą). Jei 0 – susirinkimas laikomas įvykusiu nepriklausomai nuo dalyvių skaičiaus.',
  'number',
  'Visuotinis susirinkimas (GA)',
  240,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 16. meeting_chair_is_org_chair (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'meeting_chair_is_org_chair',
  'Ar bendruomenės pirmininkas automatiškai yra susirinkimo pirmininkas (pagal įstatus)?',
  'radio',
  'Visuotinis susirinkimas (GA)',
  250,
  true,
  true,
  '[
    {"label": "Taip, automatiškai", "value": "yes_auto"},
    {"label": "Ne, renkamas susirinkimo metu", "value": "no_elected"},
    {"label": "Priklauso nuo situacijos (renkamas, jei pirmininkas nedalyvauja)", "value": "conditional"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 17. meeting_secretary_selection (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'meeting_secretary_selection',
  'Kaip paskiriamas susirinkimo sekretorius?',
  'radio',
  'Visuotinis susirinkimas (GA)',
  260,
  true,
  true,
  '[
    {"label": "Renkamas susirinkimo metu balsavimu", "value": "elected"},
    {"label": "Paskiria susirinkimo pirmininkas", "value": "appointed_by_chair"},
    {"label": "Paskiriamas iš anksto (nurodomas darbotvarkėje)", "value": "preassigned"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 4. Balsavimo kanalai (GA)
-- ==================================================

-- 18. early_voting (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'early_voting',
  'Ar leidžiamas išankstinis balsavimas iki susirinkimo (raštu / nuotoliu)?',
  'radio',
  'Balsavimo kanalai (GA)',
  300,
  true,
  true,
  '[
    {"label": "Neleidžiamas", "value": "not_allowed"},
    {"label": "Leidžiamas tik raštu", "value": "written_only"},
    {"label": "Leidžiamas tik nuotoliu", "value": "remote_only"},
    {"label": "Leidžiamas ir raštu, ir nuotoliu", "value": "written_and_remote"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 19. remote_vote_freeze_hours (number)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'remote_vote_freeze_hours',
  'Išankstinio balsavimo užšaldymas: kiek valandų iki susirinkimo uždaromas balsavimas? (val.)',
  'number',
  'Balsavimo kanalai (GA)',
  310,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 20. one_member_one_vote (radio: Taip - fiksuotas)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'one_member_one_vote',
  'Ar taikote taisyklę „vienas narys = vienas balsas“ (jei balsavo nuotoliu/raštu – negali registruotis gyvai)?',
  'radio',
  'Balsavimo kanalai (GA)',
  320,
  true,
  true,
  '[
    {"label": "Taip (visada taikoma)", "value": "always"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 21. live_voting_capture_mode (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'live_voting_capture_mode',
  'Kaip sistemoje fiksuojami gyvo balsavimo rezultatai?',
  'radio',
  'Balsavimo kanalai (GA)',
  330,
  true,
  true,
  '[
    {"label": "Agreguotai (suvedami PRIEŠ ir SUSILAIKĖ; UŽ apskaičiuojama)", "value": "aggregate"},
    {"label": "Individualiai (kiekvienas narys balsuoja savo paskyroje)", "value": "per_member"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 5. Sprendimų priėmimas
-- ==================================================

-- 22. vote_majority_rule_default (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'vote_majority_rule_default',
  'Kokia dauguma taikoma tipiniams sprendimams (jei įstatai nenurodo kitaip)?',
  'radio',
  'Sprendimų priėmimas',
  400,
  true,
  true,
  '[
    {"label": "Paprasta balsų dauguma (UŽ > PRIEŠ)", "value": "simple_majority"},
    {"label": "Kvalifikuota 2/3 dauguma", "value": "two_thirds"},
    {"label": "Kvalifikuota 3/4 dauguma", "value": "three_quarters"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 23. abstain_handling (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'abstain_handling',
  'Kaip traktuojami SUSILAIKĘ balsai priimant sprendimą?',
  'radio',
  'Sprendimų priėmimas',
  410,
  true,
  true,
  '[
    {"label": "Skaičiuojami tik UŽ ir PRIEŠ (SUSILAIKĘ neįtakoja daugumos)", "value": "exclude_from_denominator"},
    {"label": "SUSILAIKĘ skaičiuojami kaip dalyvavimas, bet ne kaip UŽ/PRIEŠ", "value": "count_participation_only"},
    {"label": "SUSILAIKĘ traktuojami kaip PRIEŠ", "value": "treat_as_against"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 6. Viešinimas ir pranešimai
-- ==================================================

-- 24. agenda_public_summary (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'agenda_public_summary',
  'Ar darbotvarkės santrauka turi būti vieša bendruomenės puslapyje? (pavadinimai + trumpi aprašymai)',
  'radio',
  'Viešinimas ir pranešimai',
  500,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 25. send_agenda_email_notifications (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'send_agenda_email_notifications',
  'Ar siųsti el. laiškus aktyviems nariams (pagal aktyvių narių sąrašą) paskelbus susirinkimą ir darbotvarkę?',
  'radio',
  'Viešinimas ir pranešimai',
  510,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 26. protocol_signed_required (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'protocol_signed_required',
  'Ar susirinkimą laikyti pilnai užbaigtu tik įkėlus pasirašytą (skenuotą) protokolo PDF?',
  'radio',
  'Viešinimas ir pranešimai',
  520,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 7. Idėjos ir projektai
-- ==================================================

-- 27. idea_vote_duration_days (number)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_vote_duration_days',
  'Kiek dienų trunka idėjos balsavimas?',
  'number',
  'Idėjos ir projektai',
  600,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 28. idea_vote_min_participation_percent (number)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_vote_min_participation_percent',
  'Kiek procentų aktyvių narių (pagal aktyvių narių sąrašą) turi sudalyvauti idėjos balsavime, kad jis būtų laikomas įvykusiu? (%)',
  'number',
  'Idėjos ir projektai',
  610,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 29. idea_public_default (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_public_default',
  'Ar naujos idėjos pagal nutylėjimą turi būti viešinamos bendruomenės puslapyje?',
  'radio',
  'Idėjos ir projektai',
  620,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 30. idea_auto_create_project_on_pass (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_auto_create_project_on_pass',
  'Ar patvirtinus idėją automatiškai sukurti projektą (su biudžetu)?',
  'radio',
  'Idėjos ir projektai',
  630,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 31. project_support_money_enabled (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'project_support_money_enabled',
  'Ar projekte leisti piniginę paramą (aukoti EUR)?',
  'radio',
  'Idėjos ir projektai',
  640,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 32. project_support_in_kind_enabled (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'project_support_in_kind_enabled',
  'Ar projekte leisti daiktinę paramą (mediena, dažai, tvirtinimo detalės ir pan.)?',
  'radio',
  'Idėjos ir projektai',
  650,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 33. project_support_work_enabled (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'project_support_work_enabled',
  'Ar projekte leisti siūlyti fizinę pagalbą (darbo valandos, transportas ir pan.)?',
  'radio',
  'Idėjos ir projektai',
  660,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 34. project_support_live_visibility (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'project_support_live_visibility',
  'Ar projekto paramos suvestinė (aukos/pasiūlymai) turi būti rodoma realiu laiku nariams?',
  'radio',
  'Idėjos ir projektai',
  670,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 8. Finansų kontrolė
-- ==================================================

-- 35. expense_approval_required (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'expense_approval_required',
  'Ar reikalingas papildomas tvirtinimas išlaidoms (pvz., valdybos ar pirmininko)?',
  'radio',
  'Finansų kontrolė',
  700,
  false,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 36. expense_approval_threshold (number, tik jei expense_approval_required = yes)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'expense_approval_threshold',
  'Nuo kokios sumos (EUR) reikalingas papildomas išlaidų tvirtinimas?',
  'number',
  'Finansų kontrolė',
  710,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 37. is_social_business (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'is_social_business',
  'Ar bendruomenė vykdo socialinio verslo veiklą (papildomi finansų/ataskaitų reikalavimai)?',
  'radio',
  'Finansų kontrolė',
  720,
  false,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- CREATE NEW SCHEMA VERSION AND MARK ORGS AS NEEDS_UPDATE
-- ==================================================
-- After updating questions, create a new schema version
-- This will automatically mark all organizations as NEEDS_UPDATE
-- ==================================================

-- Create new schema version (this will mark all orgs as NEEDS_UPDATE)
DO $$
DECLARE
  v_result RECORD;
BEGIN
  -- Check if create_schema_version function exists
  IF EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'create_schema_version'
  ) THEN
    -- Create new schema version
    SELECT * INTO v_result
    FROM public.create_schema_version(
      'Atnaujintas governance klausimynas V2: visi Taip/Ne kaip radio, pridėti pirmininko kadencijos klausimai, datos tipas'
    );
    
    -- Log the result (optional, for debugging)
    RAISE NOTICE 'Schema version created: % (reason: %)', v_result.version_no, v_result.reason;
  ELSE
    RAISE WARNING 'create_schema_version function does not exist. Organizations will not be automatically marked as NEEDS_UPDATE.';
  END IF;
END $$;

