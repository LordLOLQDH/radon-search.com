-- Radon Search backend schema v0.2.0
-- All access is mediated by the Edge Function using a server-side secret.
create table if not exists public.search_history (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  query_text text not null check (char_length(query_text) between 1 and 300),
  visitor_id uuid,
  consent_version text not null default 'v1',
  result_count integer not null default 0
);
create index if not exists search_history_created_at_idx on public.search_history (created_at desc);
create index if not exists search_history_query_idx on public.search_history using gin (to_tsvector('simple', query_text));

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event_type text not null check (event_type in ('blocked_query','rate_limited','invalid_request')),
  reason text not null,
  ip_hash text,
  query_excerpt text
);
create index if not exists security_events_created_at_idx on public.security_events (created_at desc);

create table if not exists public.request_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1
);

alter table public.search_history enable row level security;
alter table public.security_events enable row level security;
alter table public.request_limits enable row level security;

-- No direct access from browser roles. The Edge Function uses a secret server-side key.
revoke all on public.search_history from anon, authenticated;
revoke all on public.security_events from anon, authenticated;
revoke all on public.request_limits from anon, authenticated;
grant all on public.search_history to service_role;
grant all on public.security_events to service_role;
grant all on public.request_limits to service_role;
