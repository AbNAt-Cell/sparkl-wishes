create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Anyone can read settings (non-sensitive business config)
create policy if not exists "Anyone can read settings"
  on public.app_settings for select
  using (true);

-- Writes will be done via service role in Edge Functions; no direct insert/update for clients
create policy if not exists "No direct writes" on public.app_settings for all using (false) with check (false);

-- Seed defaults if empty
insert into public.app_settings(key, value)
select 'payments', jsonb_build_object(
  'paystackEnabled', true,
  'allowedMethods', jsonb_build_array('card','bank_transfer','mobile_money'),
  'platformFeePercent', 0.05,
  'platformFeeMin', 0,
  'platformFeeMax', 100
)
where not exists (select 1 from public.app_settings where key = 'payments');


