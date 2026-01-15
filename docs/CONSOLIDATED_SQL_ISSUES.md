# consolidated_all.sql Problemos ir Sprendimai

## Problema

`consolidated_all.sql` failas buvo suformatuotas iš CSV formato, todėl turi daug sintaksės klaidų.

## Rastos Klaidos

### 1. SELECT Statement Klaidos
```sql
-- NETIESINGAI:
SELECT status,
FROM public.org_rulesets,
WHERE id = p_ruleset_id;

-- TEISINGAI:
SELECT status, org_id
INTO v_current_status, v_org_id
FROM public.org_rulesets
WHERE id = p_ruleset_id;
```

### 2. IF Statement Klaidos
```sql
-- NETIESINGAI:
IF NOT FOUND THEN,
RETURN QUERY SELECT FALSE,

-- TEISINGAI:
IF NOT FOUND THEN
  RETURN QUERY SELECT FALSE;
```

### 3. UPDATE Statement Klaidos
```sql
-- NETIESINGAI:
UPDATE public.org_rulesets,
SET
status = 'ACTIVE',

-- TEISINGAI:
UPDATE public.org_rulesets
SET
  status = 'ACTIVE',
```

### 4. RETURN QUERY Klaidos
```sql
-- NETIESINGAI:
RETURN QUERY SELECT FALSE,

-- TEISINGAI:
RETURN QUERY SELECT FALSE;
```

### 5. Trūkstami Parametrai
```sql
-- NETIESINGAI:
approved_by = COALESCE(p_approved_by,

-- TEISINGAI:
approved_by = COALESCE(p_approved_by, auth.uid())
```

## Sprendimai

### Variantas A: Taisyti Rankiniu Būdu
- Taisyti visas klaidas rankiniu būdu
- **Privalumai**: Pilnas kontrolė
- **Trūkumai**: Labai daug laiko, galimos klaidos

### Variantas B: Sukurti Naują Schema Dump (REKOMENDUOJAMA)
- Naudoti `supabase db dump` arba `pg_dump`
- **Privalumai**: Teisinga schema, be klaidų
- **Trūkumai**: Reikia prieigos prie duomenų bazės

### Variantas C: Naudoti Tik Modulius
- Naudoti tik `sql/modules/` failus
- `consolidated_all.sql` naudoti tik kaip reference
- **Privalumai**: Veikiantys failai, organizuoti
- **Trūkumai**: Nėra vieno failo su visa schema

## Rekomendacija

**Naudoti Variantą C** - moduliai jau organizuoti ir veikia. `consolidated_all.sql` palikti kaip reference dokumentaciją, bet nevykdyti tiesiogiai.

Jei reikia naujos schemos:
1. Naudoti `npx supabase db dump > sql/consolidated_all_new.sql`
2. Arba naudoti Supabase Dashboard SQL Editor

## Status

- ✅ Moduliai organizuoti ir veikia
- ⚠️ `consolidated_all.sql` turi sintaksės klaidų
- ✅ Galima naudoti modulius vietoj consolidated

