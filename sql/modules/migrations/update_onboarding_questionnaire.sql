-- ==================================================
-- Atnaujintas bendruomenės registracijos / governance onboarding klausimynas
-- ==================================================
-- Pagal GA (susirinkimų) srautą, hibridinį balsavimą, 1 narys = 1 balsas,
-- idėja→projektas→parama modulį ir viešinimą.
-- ==================================================
-- UPSERT pagal question_key (unikalus)
-- Jei jau egzistuoja - UPDATE
-- Jei neegzistuoja - INSERT
-- ==================================================

-- ==================================================
-- NARYSTĖ IR ROLĖS
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
    {"label": "Pirmininkas tvirtina", "value": "chairman"},
    {"label": "Valdyba tvirtina", "value": "board"},
    {"label": "Administratorius tvirtina", "value": "admin"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 2. has_board
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
  'Ar bendruomenėje yra valdyba?',
  'checkbox',
  'Narystė ir rolės',
  20,
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

-- 3. has_auditor
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
  'checkbox',
  'Narystė ir rolės',
  30,
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

-- 4. board_quorum_percentage
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
  'Jei yra valdyba: koks minimalus valdybos kvorumas sprendimams? (procentais nuo valdybos narių)',
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

-- ==================================================
-- MOKESČIAI IR SKOLOS
-- ==================================================

-- 5. track_fees
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
  'checkbox',
  'Mokesčiai ir skolos',
  100,
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

-- 6. fee_deadline_days
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
  'Per kiek dienų nuo termino narys laikomas nesumokėjusiu (skolininku)?',
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

-- 7. restrict_debtors
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
    {"label": "Blokuoti balsavimą (kol skola nepadengta)", "value": "block_vote"},
    {"label": "Tik įspėti (balsuoti gali)", "value": "warning_only"},
    {"label": "Netinka / nenaudojame skolų kriterijaus", "value": "not_applicable"}
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
-- GA SUSIRINKIMAI
-- ==================================================

-- 8. meeting_notice_days
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
  'Prieš kiek dienų mažiausiai privaloma paskelbti visuotinį susirinkimą? (d.)',
  'number',
  'GA susirinkimai',
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

-- 9. ga_quorum_percent
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
  'Koks visuotinio susirinkimo kvorumas? (procentais nuo ACTIVE narių)',
  'number',
  'GA susirinkimai',
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

-- 10. ga_repeat_meeting_allowed
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
  'Jei pirmas susirinkimas neįvyksta dėl kvorumo – ar leidžiamas pakartotinis susirinkimas?',
  'checkbox',
  'GA susirinkimai',
  220,
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

-- 11. ga_repeat_notice_days
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
  'Jei leidžiamas pakartotinis susirinkimas: prieš kiek dienų jį reikia paskelbti? (d.)',
  'number',
  'GA susirinkimai',
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

-- 12. ga_repeat_quorum_percent
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
  'Jei leidžiamas pakartotinis susirinkimas: koks kvorumas jam taikomas? (procentais nuo ACTIVE narių; jei 0 – reiškia ''įvyksta nepriklausomai nuo dalyvių skaičiaus'')',
  'number',
  'GA susirinkimai',
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

-- 13. meeting_chair_is_org_chair
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
  'GA susirinkimai',
  260,
  true,
  true,
  '[
    {"label": "Taip (automatiškai)", "value": "yes_auto"},
    {"label": "Ne (renkamas susirinkimo metu)", "value": "no_elected"},
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

-- 14. meeting_secretary_selection
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
  'GA susirinkimai',
  270,
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
-- BALSAVIMO KANALAI
-- ==================================================

-- 15. early_voting
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
  'Balsavimo kanalai',
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

-- 16. remote_vote_freeze_hours
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
  'Kiek valandų iki susirinkimo turi būti uždaromas išankstinis (raštu/nuotoliu) balsavimas? (val.)',
  'number',
  'Balsavimo kanalai',
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

-- 17. one_member_one_vote
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
  'Taisyklė: vienas narys turi tik vieną balsą; jei balsavo nuotoliu/raštu – negali registruotis gyvai (dvigubas dalyvavimas draudžiamas).',
  'radio',
  'Balsavimo kanalai',
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

-- 18. live_voting_capture_mode
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
  'Kaip fiksuojami gyvo balsavimo rezultatai sistemoje?',
  'radio',
  'Balsavimo kanalai',
  330,
  true,
  true,
  '[
    {"label": "Agreguotai (sekretorius suveda PRIEŠ ir SUSILAIKĖ; UŽ apskaičiuojama)", "value": "aggregate"},
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
-- SPRENDIMŲ PRIĖMIMAS
-- ==================================================

-- 19. vote_majority_rule_default
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
  'Kokia dauguma taikoma tipiniams sprendimams? (jei įstatai nenurodo kitaip)',
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

-- 20. abstain_handling
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
    {"label": "Neįskaičiuojami į daugumos skaičiavimą (tik UŽ ir PRIEŠ)", "value": "exclude_from_denominator"},
    {"label": "Įskaičiuojami kaip dalyvavimas, bet ne UŽ/PRIEŠ", "value": "count_participation_only"},
    {"label": "Traktuojami kaip PRIEŠ", "value": "treat_as_against"}
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
-- VIEŠINIMAS IR PRANEŠIMAI
-- ==================================================

-- 21. agenda_public_summary
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
  'Ar darbotvarkės santrauka turi būti vieša bendruomenės puslapyje (pavadinimai + trumpi aprašymai)?',
  'checkbox',
  'Viešinimas ir pranešimai',
  500,
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

-- 22. send_agenda_email_notifications
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
  'Ar siųsti el. laiškus ACTIVE nariams paskelbus darbotvarkę / susirinkimą?',
  'checkbox',
  'Viešinimas ir pranešimai',
  510,
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

-- 23. protocol_signed_required
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
  'Ar susirinkimą laikyti pilnai užbaigtu tik įkėlus pasirašyto (skenuoto) protokolo PDF?',
  'checkbox',
  'Viešinimas ir pranešimai',
  520,
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

-- ==================================================
-- IDĖJOS IR PROJEKTAI
-- ==================================================

-- 24. idea_vote_duration_days
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
  'Kiek dienų trunka idėjos balsavimas (Strategija → Idėjos)?',
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

-- 25. idea_vote_min_participation_percent
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
  'Kiek procentų ACTIVE narių turi sudalyvauti idėjos balsavime, kad jis būtų laikomas įvykusiu? (%)',
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

-- 26. idea_public_default
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
  'checkbox',
  'Idėjos ir projektai',
  620,
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

-- 27. idea_auto_create_project_on_pass
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
  'Ar patvirtinus idėją automatiškai kurti projektą (su biudžetu)?',
  'checkbox',
  'Idėjos ir projektai',
  630,
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

-- 28. project_support_money_enabled
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
  'checkbox',
  'Idėjos ir projektai',
  640,
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

-- 29. project_support_in_kind_enabled
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
  'checkbox',
  'Idėjos ir projektai',
  650,
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

-- 30. project_support_work_enabled
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
  'checkbox',
  'Idėjos ir projektai',
  660,
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

-- 31. project_support_live_visibility
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
  'Ar projekto paramos suvestinė (aukos/pasiūlymai) turi būti rodoma gyvai nariams?',
  'checkbox',
  'Idėjos ir projektai',
  670,
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

-- ==================================================
-- FINANSŲ KONTROLĖ
-- ==================================================

-- 32. expense_approval_required
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
  'Ar reikalingas papildomas tvirtinimas išlaidoms (pvz. valdybos/pirmininko)?',
  'checkbox',
  'Finansų kontrolė',
  700,
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

-- 33. expense_approval_threshold
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

-- 34. is_social_business
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
  'checkbox',
  'Finansų kontrolė',
  720,
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

-- ==================================================
-- PASTABOS
-- ==================================================
-- Visi klausimai yra UPSERT pagal question_key
-- Radio tipo klausimams options yra JSONB masyvas su label/value
-- Checkbox ir number tipo klausimams options yra NULL
-- ==================================================

