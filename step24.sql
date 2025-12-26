create table if not exists project_audit_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  actor_user_id uuid not null,
  target_user_id uuid,
  action text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on project_audit_logs (project_id);
create index on project_audit_logs (created_at desc);

