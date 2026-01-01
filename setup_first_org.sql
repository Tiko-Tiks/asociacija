-- Setup Script: Sukurti pirmą organizaciją
-- Paleiskite šį scriptą Supabase SQL Editor

-- 1. Rasti jūsų vartotojo ID (pakeiskite el. paštą)
DO $$
DECLARE
  v_user_id uuid;
  v_user_email text := 'your-email@example.com';  -- PAKEISKITE ČIA
  v_org_id uuid;
BEGIN
  -- Gaukite vartotojo ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Vartotojas nerastas. Patikrinkite el. paštą: %', v_user_email;
  END IF;
  
  RAISE NOTICE 'Rastas vartotojas: % (ID: %)', v_user_email, v_user_id;
  
  -- Sukurkite organizaciją su slug
  INSERT INTO orgs (name, slug, created_at)
  VALUES ('Mano Bendruomenė', 'mano-bendruomene', NOW())
  RETURNING id INTO v_org_id;
  
  RAISE NOTICE 'Sukurta organizacija: % (ID: %)', 'Mano Bendruomenė', v_org_id;
  
  -- Pridėkite narystę kaip OWNER
  INSERT INTO memberships (org_id, user_id, role, status)
  VALUES (v_org_id, v_user_id, 'OWNER', 'ACTIVE');
  
  RAISE NOTICE 'Sukurta narystė: vartotojas % yra OWNER organizacijoje %', v_user_email, 'Mano Bendruomenė';
  RAISE NOTICE '✅ Sėkmingai sukurta! Dabar perkraukite puslapį.';
  
END $$;

