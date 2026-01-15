# ENABLE IMMEDIATE VOTING FOR TESTING

## ✅ SQL SCRIPT READY

**Organization:** `678b0788-b544-4bf8-8cf5-44dfb2185a52`

## 📋 OPTIONS TO RUN:

### **Option 1: Supabase Dashboard SQL Editor (Recommended)**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste contents of `sql/enable_immediate_voting_direct.sql`
4. Run the script

### **Option 2: Server Action**
Use the server action `enableImmediateVotingForTest()` from `src/app/actions/enable-immediate-voting.ts`

## 🎯 WHAT IT DOES:

1. ✅ Sets `early_voting` to `'written_and_remote'`
2. ✅ Sets `early_voting_days` to `0` (immediate)
3. ✅ Updates existing votes to open immediately
4. ✅ Verifies changes

## 📝 CHANGES:

- **early_voting:** `'written_and_remote'` - Allows remote voting
- **early_voting_days:** `0` - Opens immediately (no delay)

## 🧪 TESTING:

After running:
1. Publish a meeting
2. Votes should open immediately
3. Members can vote right away

---

**Script location:** `sql/enable_immediate_voting_direct.sql`

