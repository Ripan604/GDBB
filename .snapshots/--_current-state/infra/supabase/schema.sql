create table if not exists demo_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  problem_type text not null,
  size int not null,
  params_json jsonb not null,
  ub double precision,
  lb double precision,
  gap double precision,
  runtime_ms int,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  demo_run_id uuid references demo_runs(id) on delete cascade,
  nickname text not null,
  gap double precision not null,
  runtime_ms int not null,
  domain text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists benchmark_results (
  id uuid primary key default gen_random_uuid(),
  dataset_version text not null,
  domain text not null,
  algorithm text not null,
  metrics_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  page_context text,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  citations_json jsonb,
  created_at timestamptz not null default now()
);
