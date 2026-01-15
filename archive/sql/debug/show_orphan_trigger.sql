SELECT pg_get_triggerdef(oid) as trigger_def
FROM pg_trigger
WHERE tgname = 'trg_prevent_orphan_org';

