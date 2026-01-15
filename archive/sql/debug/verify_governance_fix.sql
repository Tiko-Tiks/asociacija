-- Verify current governance settings
SELECT 
  org_id,
  status,
  answers->>'track_fees' as track_fees,
  answers->>'restrict_debtors' as restrict_debtors,
  answers
FROM governance_configs
WHERE org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52';

-- Check validation errors
SELECT COUNT(*) as error_count
FROM governance_config_validation
WHERE org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
  AND severity = 'error';

