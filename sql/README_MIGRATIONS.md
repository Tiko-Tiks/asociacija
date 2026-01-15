# SQL Migrations - Constants Update

## 📋 Overview

SQL skripta paketas, skirtas atnaujinti duomenų bazę pagal naujus konstantus:
- **MEMBERSHIP_STATUS:** PENDING, ACTIVE, SUSPENDED, LEFT
- **INVOICE_STATUS:** DRAFT, SENT, PAID, OVERDUE

---

## 📁 Failai

### 1. `validate_membership_status.sql`
**Paskirtis:** Patikrinti esamus member_status ir status reikšmes

**Funkcionalumas:**
- ✅ Rodo visas esamas member_status reikšmes
- ✅ Identifikuoja nevalidžias reikšmes
- ✅ Tikrina NULL reikšmes
- ✅ Analizuoja member_status vs status nesutapimus

**Naudojimas:**
```bash
psql -h HOST -U USER -d DATABASE -f sql/validate_membership_status.sql
```

**Expected output:**
```
 member_status | count | validation_status 
---------------+-------+-------------------
 ACTIVE        |   142 | ✅ VALID
 PENDING       |    23 | ✅ VALID
 SUSPENDED     |     5 | ✅ VALID
```

---

### 2. `validate_invoice_status.sql`
**Paskirtis:** Patikrinti esamus invoice status reikšmes

**Funkcionalumas:**
- ✅ Rodo visas esamas status reikšmes su procentais
- ✅ Identifikuoja nevalidžias reikšmes
- ✅ Analizuoja SENT sąskaitas, kurios turėtų būti OVERDUE
- ✅ Rodo DRAFT sąskaitų statistiką

**Naudojimas:**
```bash
psql -h HOST -U USER -d DATABASE -f sql/validate_invoice_status.sql
```

**Expected output:**
```
 status  | count | percentage | validation_status 
---------+-------+------------+-------------------
 PAID    |   456 |      65.14 | ✅ VALID
 SENT    |   189 |      26.98 | ✅ VALID
 OVERDUE |    45 |       6.42 | ✅ VALID
 DRAFT   |    10 |       1.43 | ✅ VALID
```

---

### 3. `migrate_constants.sql`
**Paskirtis:** Pagrindinė migracijos skripta

**Funkcionalumas:**
- ✅ Step-by-step migracijos procesas
- ✅ Automatinė validacija prieš migraciją
- ✅ Pavyzdiniai UPDATE statement'ai legacy reikšmėms
- ✅ Auto-mark OVERDUE invoices
- ✅ (Optional) CHECK constraints pridėjimas
- ✅ Migracijos verifikacija
- ✅ Audit log įrašas

**Struktūra:**
1. **STEP 1:** Backup rekomendacijos
2. **STEP 2:** Validacija
3. **STEP 3:** Membership status migracija
4. **STEP 4:** Invoice status migracija
5. **STEP 5:** Auto-mark overdue invoices
6. **STEP 6:** Add constraints (optional)
7. **STEP 7:** Verifikacija
8. **STEP 8:** Audit log

**Naudojimas:**
```bash
# 1. Backup first!
pg_dump -h HOST -U USER -d DATABASE -t memberships > backup_memberships.sql
pg_dump -h HOST -U USER -d DATABASE -t invoices > backup_invoices.sql

# 2. Review and uncomment relevant UPDATE statements
nano sql/migrate_constants.sql

# 3. Run migration
psql -h HOST -U USER -d DATABASE -f sql/migrate_constants.sql
```

---

### 4. `schedule_overdue_invoices.sql`
**Paskirtis:** Automatinis OVERDUE statusų atnaujinimas

**Funkcionalumas:**
- ✅ **Option 1:** pg_cron scheduled job (PostgreSQL)
- ✅ **Option 2:** Database function + trigger
- ✅ **Option 3:** RPC endpoint (Vercel Cron / GitHub Actions)
- ✅ Audit logging integration
- ✅ Monitoring view

**Recommended setup (Supabase):**
```sql
-- 1. Create RPC function
\i sql/schedule_overdue_invoices.sql

-- 2. Test it
SELECT mark_overdue_invoices_rpc();

-- 3. Set up Vercel Cron (app/api/cron/overdue-invoices/route.ts):
export async function GET(request: Request) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('mark_overdue_invoices_rpc')
  
  if (error) {
    return Response.json({ error }, { status: 500 })
  }
  
  return Response.json(data)
}

-- 4. Configure vercel.json:
{
  "crons": [{
    "path": "/api/cron/overdue-invoices",
    "schedule": "0 0 * * *"  // Daily at midnight
  }]
}
```

---

## 🚀 Execution Plan

### Pre-Migration Checklist
- [ ] Review all 4 SQL files
- [ ] Understand your current data state
- [ ] Create database backups
- [ ] Test on staging first
- [ ] Schedule maintenance window (if needed)

### Execution Steps

#### 1️⃣ **Validation Phase** (READ-ONLY)
```bash
# Run validation scripts
psql -f sql/validate_membership_status.sql > membership_validation.log
psql -f sql/validate_invoice_status.sql > invoice_validation.log

# Review logs
cat membership_validation.log
cat invoice_validation.log
```

**Questions to answer:**
- Are there any invalid values?
- Are there NULL values?
- Do we have mismatches between member_status and status?
- How many SENT invoices should be OVERDUE?

#### 2️⃣ **Backup Phase** (CRITICAL)
```bash
# Full backup
pg_dump -h HOST -U USER -d DATABASE > full_backup_$(date +%Y%m%d).sql

# Table-specific backups
pg_dump -t memberships > memberships_backup.sql
pg_dump -t invoices > invoices_backup.sql
```

#### 3️⃣ **Migration Phase** (WRITE)
```bash
# Review migration script
nano sql/migrate_constants.sql

# Uncomment relevant UPDATE statements
# Modify as needed for your data

# Run migration
psql -f sql/migrate_constants.sql > migration.log 2>&1

# Review log
cat migration.log
```

#### 4️⃣ **Verification Phase**
```sql
-- Check memberships
SELECT member_status, COUNT(*) FROM memberships GROUP BY member_status;

-- Check invoices
SELECT status, COUNT(*) FROM invoices GROUP BY status;

-- Check for invalid values
SELECT * FROM memberships 
WHERE member_status NOT IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'LEFT');

SELECT * FROM invoices 
WHERE status NOT IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE');
```

#### 5️⃣ **Automation Setup** (POST-MIGRATION)
```bash
# Set up scheduled job for OVERDUE invoices
psql -f sql/schedule_overdue_invoices.sql

# Test the function
psql -c "SELECT mark_overdue_invoices_rpc();"

# Set up monitoring
psql -c "SELECT * FROM overdue_invoices_summary;"
```

---

## ⚠️ Important Notes

### About `member_status` vs `status`

**Database schema:**
- `member_status` - Business logic field (PENDING, ACTIVE, SUSPENDED, LEFT)
- `status` - Technical field for RLS (usually ACTIVE)

**Current usage in code:**
- Most guards use `member_status`
- Some legacy code uses `status`

**Recommendation:** 
- Use `member_status` for business logic
- Keep `status` for RLS (set to ACTIVE by default)
- See `COMPREHENSIVE_CODE_AUDIT.md` section 3 for details

### About OVERDUE Status

**Options:**
1. **Manual only** - OWNER marks as OVERDUE
2. **Automated** - Scheduled job (recommended)
3. **Hybrid** - Auto-mark + manual override

**Recommendation:** Use automated job (Option 2)

### About CHECK Constraints

**Pros:**
- ✅ Enforce data integrity at DB level
- ✅ Prevent invalid values
- ✅ Self-documenting

**Cons:**
- ⚠️ May break if you need new statuses
- ⚠️ Requires ALTER TABLE to add new values

**Recommendation:** Add constraints only if you're confident the status list is final.

---

## 🔄 Rollback Plan

If something goes wrong:

```bash
# Option 1: Restore from backup
psql -f full_backup_YYYYMMDD.sql

# Option 2: Restore specific tables
psql -f memberships_backup.sql
psql -f invoices_backup.sql

# Option 3: Manual rollback (if you logged changes)
# Review audit_logs to see what changed
SELECT * FROM audit_logs 
WHERE action = 'DATA_MIGRATION' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

## 📊 Monitoring

### Post-Migration Dashboard Queries

```sql
-- Membership status distribution
SELECT 
  member_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM memberships
GROUP BY member_status
ORDER BY count DESC;

-- Invoice status distribution
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM invoices
GROUP BY status
ORDER BY count DESC;

-- Overdue invoices by org
SELECT * FROM overdue_invoices_summary;

-- Recent status changes (if you have audit_logs)
SELECT 
  action,
  target_table,
  COUNT(*) as changes,
  MAX(created_at) as last_change
FROM audit_logs
WHERE target_table IN ('memberships', 'invoices')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY action, target_table
ORDER BY last_change DESC;
```

---

## ✅ Success Criteria

Migration is successful when:
- [ ] All memberships have valid member_status (PENDING, ACTIVE, SUSPENDED, LEFT)
- [ ] All invoices have valid status (DRAFT, SENT, PAID, OVERDUE)
- [ ] No NULL values in status fields
- [ ] SENT invoices past due are marked OVERDUE
- [ ] Scheduled job is working (if implemented)
- [ ] Application works with new constants
- [ ] No unexpected errors in logs

---

## 📞 Support

If you encounter issues:
1. Check validation logs
2. Review `COMPREHENSIVE_CODE_AUDIT.md` section 3
3. Test on staging first
4. Contact platform admin if unsure

**Remember:** This is a data migration - BE CAREFUL! Always backup first! 🔒

