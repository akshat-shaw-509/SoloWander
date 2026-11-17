-- Migration 007: Autonomous Sentinel Safety Agent & Inverted Watchdog Flight Plans

-- Flight Plans for Inverted Cloud Watchdog (Radio Blackout Tracking)
create table if not exists sentinel_flight_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  destination text not null,
  trail_name text,
  expected_return_at timestamptz not null,
  last_check_in_at timestamptz default now(),
  status text not null default 'ACTIVE', -- ACTIVE, COMPLETED, OVERDUE, CANCELLED
  check_in_interval_minutes int default 60,
  emergency_contacts jsonb default '[]',
  notes text,
  created_at timestamptz default now(),
  ended_at timestamptz
);

-- Real-time telemetry and danger score logs for academic evaluation & command monitoring
create table if not exists sentinel_telemetry_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  session_id uuid references safety_sessions(id) on delete set null,
  lat numeric(10,7),
  lng numeric(10,7),
  accuracy_meters numeric(8,2),
  speed_mps numeric(6,2),
  accel_magnitude numeric(6,2),
  shock_g numeric(6,2),
  danger_score numeric(4,3) not null,
  escalation_tier text not null, -- L0_NOMINAL, L1_CAUTION, L2_ANOMALY, L3_CRISIS
  risk_breakdown jsonb default '{}',
  is_online boolean default true,
  battery_level int,
  created_at timestamptz default now()
);

-- Sentinel profile settings (Safe PIN and Duress PIN)
create table if not exists sentinel_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  safe_pin_hash text default '1234',
  duress_pin_hash text default '9999',
  dead_man_timeout_seconds int default 90,
  is_sentinel_armed boolean default true,
  updated_at timestamptz default now()
);

-- RLS policies
alter table sentinel_flight_plans enable row level security;
alter table sentinel_telemetry_logs enable row level security;
alter table sentinel_profiles enable row level security;

create policy "Users can manage their own flight plans"
  on sentinel_flight_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can view and insert their own telemetry logs"
  on sentinel_telemetry_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their sentinel profile"
  on sentinel_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
