# media_items Table Inspection (Schema v15.1)

## Columns Identified from Codebase Analysis

Based on actual usage in the codebase, the following columns are confirmed to exist:

### Columns Used in SELECT Queries:
1. **`id`** - Primary key (UUID)
2. **`url`** - Stores public URL or text content (text/varchar)
3. **`category`** - Enum: 'BEFORE', 'AFTER', 'PROTOCOL' (enum)
4. **`created_at`** - Timestamp (timestamp)
5. **`object_id`** - Foreign key reference (UUID) - used in WHERE clauses
6. **`object_type`** - Enum: 'PROJECT', 'MEETING' (enum) - used in WHERE clauses

### Columns Used in INSERT Queries:
1. **`object_id`** - Required (UUID)
2. **`object_type`** - Required (enum: 'PROJECT' or 'MEETING')
3. **`url`** - Required (text/varchar) - stores public URL or text content
4. **`category`** - Required (enum: 'BEFORE', 'AFTER', 'PROTOCOL')

## Potential File Reference Column

**Question:** The user asked about a column that stores "file reference (NOT url)".

**Current State:** The codebase currently stores only the public URL in the `url` column. There is **no evidence** of a separate file reference column (like `file_path`, `storage_key`, `storage_path`, etc.) being used in the codebase.

**Possible Scenarios:**
1. The schema may have a `file_path` or `storage_key` column that exists but is not currently being used
2. The schema may only have `url` and stores both public URLs and storage paths in the same column
3. The file reference might be stored elsewhere or derived from the URL

## NOT NULL Columns (Inferred)

Based on INSERT operations, these columns appear to be NOT NULL:
- `object_id` (required in all inserts)
- `object_type` (required in all inserts)
- `url` (required in all inserts)
- `category` (required in all inserts)

Likely NOT NULL but auto-generated:
- `id` (primary key, auto-generated)
- `created_at` (timestamp, likely has default)

## SQL Inspection File

Run the SQL file `inspect_media_items_columns.sql` in your Supabase SQL Editor to get the complete, authoritative table structure including:
- All columns with exact data types
- NOT NULL constraints
- Primary keys and foreign keys
- Any file reference columns that may exist but aren't used in code

## Next Steps

1. **Run the SQL inspection** (`inspect_media_items_columns.sql`) in Supabase SQL Editor
2. **Compare results** with this codebase analysis
3. **Identify** if a file reference column exists that should be used instead of or in addition to `url`

