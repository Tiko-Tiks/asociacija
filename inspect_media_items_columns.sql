-- Inspect media_items table structure (v15.1)
-- DO NOT modify schema - inspection only

-- 1. List ALL columns of media_items
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'media_items'
ORDER BY ordinal_position;

-- 2. Identify NOT NULL columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'media_items'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- 3. Check for file reference columns (common names: file_path, storage_key, storage_path, file_reference, etc.)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'media_items'
  AND (
    column_name ILIKE '%file%' 
    OR column_name ILIKE '%storage%'
    OR column_name ILIKE '%path%'
    OR column_name ILIKE '%reference%'
    OR column_name ILIKE '%key%'
  )
ORDER BY ordinal_position;

-- 4. Get primary key and constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'media_items'
ORDER BY tc.constraint_type, kcu.ordinal_position;

