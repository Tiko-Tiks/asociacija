# Naujas consolidated_all.sql

## Apžvalga

Naujas `consolidated_all.sql` failas yra **migracijų rinkinys**, ne pilna schema.

## Charakteristikos

- **Dydis**: ~295 KB
- **Eilučių**: ~9962
- **Tipas**: Idempotent migracijos
- **Formatas**: DO $$ blokai su BEGIN/END sekcijomis

## Struktūra

Kiekviena migracija yra pažymėta:
```sql
-- ===== BEGIN migration_name.sql =====
-- Migracijos aprašymas
DO $$
BEGIN
  -- Migracijos kodas
END;
$$;
-- ===== END migration_name.sql =====
```

## Privalumai

1. **Idempotent**: Galima vykdyti kelis kartus
2. **Organizuotas**: Kiekviena migracija atskirai
3. **Teisinga sintaksė**: Nėra CSV formato klaidų
4. **Saugus**: Naudoja IF NOT EXISTS, ON CONFLICT DO UPDATE

## Skirtumai nuo seno failo

| Senas Failas | Naujas Failas |
|--------------|--------------|
| Pilna schema (CREATE TABLE, CREATE FUNCTION) | Migracijų rinkinys (ALTER TABLE, DO $$) |
| CSV formato klaidos | Teisinga sintaksė |
| ~6284 eilutės | ~9962 eilutės |
| Reference dokumentacija | Veikiantys migracijos |

## Naudojimas

### Vykdymas
```sql
-- Vykdyti visą failą
\i sql/consolidated_all.sql

-- Arba Supabase SQL Editor
```

### Patikrinimas
- ✅ Sintaksė teisinga
- ✅ Idempotent migracijos
- ✅ Organizuotos sekcijos

## Rekomendacija

**Naudoti naują failą** - jis yra teisingai suformatuotas ir veikia.

Jei reikia pilnos schemos (ne migracijų), galima:
1. Sukurti iš dabartinės duomenų bazės: `npx supabase db dump`
2. Arba naudoti modulius `sql/modules/` + `consolidated_all.sql` migracijos

## Status

- ✅ Naujas failas patikrintas
- ✅ Sintaksė teisinga
- ✅ Galima naudoti

