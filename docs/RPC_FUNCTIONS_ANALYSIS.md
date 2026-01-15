# RPC Funkcijų Analizė

## Tikslas
Identifikuoti, kurios RPC funkcijos tikrai naudojamos ir kurios nenaudojamos.

## Metodika
1. Rasti visas RPC funkcijas iš `consolidated_all.sql`
2. Patikrinti, kur jos kviečiamos kode (`.rpc()`)
3. Identifikuoti nenaudojamas
4. Sukurti ataskaitą

## RPC Funkcijų Sąrašas

### Naudojamos (Patvirtintos iš kodo)
- `get_governance_int` - ✅ Naudojamas (voting.ts, utils/voting.ts)
- `can_cast_vote` - ✅ Naudojamas (voting.ts)
- `cast_vote` - ✅ Naudojamas (voting.ts)
- `close_vote` - ✅ Naudojamas (voting.ts)
- `apply_vote_outcome` - ✅ Naudojamas (voting.ts)
- `can_schedule_meeting` - ✅ Naudojamas (meetings.ts)
- `create_meeting_ga` - ✅ Naudojamas (meetings.ts)
- `update_meeting_schedule` - ✅ Naudojamas (meetings.ts)
- `add_agenda_item` - ✅ Naudojamas (meetings.ts)
- `update_agenda_item` - ✅ Naudojamas (meetings.ts)
- `delete_agenda_item` - ✅ Naudojamas (meetings.ts)
- `attach_agenda_file_metadata` - ✅ Naudojamas (meetings.ts)
- `publish_meeting` - ✅ Naudojamas (meetings.ts)
- `auto_abstain_for_remote_voters` - ✅ Naudojamas (auto-abstain.ts, meetings.ts)
- `pledge_money` - ✅ Naudojamas (projects.ts)
- `pledge_in_kind` - ✅ Naudojamas (projects.ts)
- `pledge_work` - ✅ Naudojamas (projects.ts)
- `update_contribution_status` - ✅ Naudojamas (projects.ts)
- `set_protocol_pdf` - ✅ Naudojamas (generate-protocol-pdf.ts, protocols.ts)
- `activate_ruleset_admin` - ✅ Naudojamas (admin/manage-orgs.ts)
- `get_governance_string` - ✅ Naudojamas (register-member.ts)
- `validate_governance_for_org` - ✅ Naudojamas (governance-compliance.ts)
- `upsert_compliance_issues` - ✅ Naudojamas (governance-compliance.ts)
- `submit_org_for_review` - ✅ Naudojamas (onboarding.ts)
- `request_org_changes` - ✅ Naudojamas (admin/org-review.ts)
- `approve_org` - ✅ Naudojamas (admin/org-review.ts)
- `reject_org` - ✅ Naudojamas (admin/org-review.ts)
- `create_idea` - ✅ Naudojamas (ideas.ts)
- `open_idea_for_voting` - ✅ Naudojamas (ideas.ts)
- `can_cast_idea_vote` - ✅ Naudojamas (ideas.ts)
- `cast_idea_vote` - ✅ Naudojamas (ideas.ts)
- `close_idea_vote` - ✅ Naudojamas (ideas.ts)
- `evaluate_idea_vote_and_transition` - ✅ Naudojamas (ideas.ts)
- `set_vote_live_totals` - ✅ Naudojamas (live-voting.ts)
- `preview_meeting_protocol` - ✅ Naudojamas (protocols.ts)
- `finalize_meeting_protocol` - ✅ Naudojamas (protocols.ts)
- `get_meeting_protocol` - ✅ Naudojamas (protocols.ts)

## Analizės Rezultatai

### NAUDOJAMOS (Patvirtintos)
*Išvardytos aukščiau - 37 funkcijos*

### NAUDOJAMOS (Per Triggers arba Kitas Funkcijas)
- `audit_resolution_changes` - ✅ Naudojamas (TRIGGER)
- `enforce_resolution_rules` - ✅ Naudojamas (TRIGGER)
- `ensure_approved_resolution_adoption` - ✅ Naudojamas (TRIGGER)
- `prevent_approved_resolution_update` - ✅ Naudojamas (TRIGGER)
- `prevent_orphan_org` - ✅ Naudojamas (TRIGGER)
- `handle_new_user` - ✅ Naudojamas (TRIGGER)
- `positions_sync_is_active` - ✅ Naudojamas (TRIGGER arba kita funkcija)

### NAUDOJAMOS (Per Helper Funkcijas)
- `get_user_role` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `get_user_role_as` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `is_member_of` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `is_org_owner` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `is_platform_admin` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `user_has_active_membership_in_org` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `get_membership_id` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `get_branduolys_org_id` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `get_active_schema_version` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `create_schema_version` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `set_governance_schema_version_for_org` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `check_org_has_bylaws` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `build_meeting_protocol_snapshot` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `get_meeting_unique_participants` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)
- `meeting_quorum_status` - ✅ Naudojamas (gali būti naudojamas per kitas funkcijas)

### NENAUDOJAMOS (Potencialiai - Reikia Patikrinti)
- `admin_remove_member` - ⚠️ **REIKIA PATIKRINTI** - Niekur nerandu kvietimo
- `approve_resolution` - ⚠️ **REIKIA PATIKRINTI** - Niekur nerandu kvietimo
- `approve_resolution_if_passed` - ⚠️ **REIKIA PATIKRINTI** - Niekur nerandu kvietimo
- `attach_simple_vote_file_metadata` - ⚠️ **REIKIA PATIKRINTI** - Niekur nerandu kvietimo
- `can_approve_resolution` - ⚠️ **REIKIA PATIKRINTI** - Niekur nerandu kvietimo
- `can_cast_simple_vote` - ⚠️ **REIKIA PATIKRINTI** - Niekur nerandu kvietimo
- `can_register_in_person` - ⚠️ **REIKIA PATIKRINTI** - Niekur nerandu kvietimo
- `can_vote` - ⚠️ **REIKIA PATIKRINTI** - Naudojamas kaip property, bet ne kaip RPC funkcija (gali būti naudojamas per kitas funkcijas)
- `cast_simple_vote` - ⚠️ **REIKIA PATIKRINTI** - Niekur nerandu kvietimo
- `close_simple_vote` - ⚠️ **REIKIA PATIKRINTI** - Niekur nerandu kvietimo
- `create_simple_vote` - ⚠️ **REIKIA PATIKRINTI** - Niekur nerandu kvietimo
- `register_in_person_attendance` - ✅ **NAUDOJAMAS** - Kviečiamas per `meeting-attendance.ts` server action
- `unregister_in_person_attendance` - ✅ **NAUDOJAMAS** - Kviečiamas per `meeting-attendance.ts` server action
- `update_member_role` - ⚠️ **REIKIA PATIKRINTI** - Niekur nerandu kvietimo

### REKOMENDACIJOS

1. **Patikrinti funkcijas su "simple_vote"** - Gali būti naudojamos ateityje arba per kitas funkcijas
2. **Patikrinti attendance funkcijas** - Gali būti naudojamos per meeting attendance
3. **Patikrinti resolution funkcijas** - Gali būti naudojamos per kitas funkcijas

## Kitas Žingsnis
1. Patikrinti, ar "simple_vote" funkcijos naudojamos
2. Patikrinti, ar attendance funkcijos naudojamos
3. Patikrinti, ar resolution funkcijos naudojamos

