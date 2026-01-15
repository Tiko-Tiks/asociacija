-- Patikrinti pgcrypto extension status ir funkcijų vietą
-- Paleiskite šį SQL, kad pamatytumėte, kur yra digest() funkcija

-- 1. Patikrinti extension status
SELECT extname, extversion, nspname as schema_name
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname = 'pgcrypto';

-- 2. Ieškoti digest() funkcijos visose schemose
SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'digest'
ORDER BY n.nspname;

-- 3. Patikrinti, ar extension funkcijos yra prieinamos
SELECT 
    routine_name,
    routine_schema,
    routine_type
FROM information_schema.routines
WHERE routine_name = 'digest'
ORDER BY routine_schema;
