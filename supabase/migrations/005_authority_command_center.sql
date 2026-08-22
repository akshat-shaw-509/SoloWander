-- Authority Command Dashboard

create table authority_profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid unique not null references users(id) on delete cascade,
  operator_name      text not null,
  department         text not null default 'Tourism Safety Cell',
  jurisdiction       text not null default 'Northeast India',
  control_room_phone text,
  created_at         timestamptz default now()
);

create table authority_responders (
  id                uuid primary key default gen_random_uuid(),
  authority_user_id uuid not null references users(id) on delete cascade,
  name              text not null,
  role              text not null default 'field_responder',
  phone             text,
  base_city         text,
  status            text not null default 'available',
  created_at        timestamptz default now()
);

alter table safety_incidents
  add column assigned_responder_id uuid references authority_responders(id) on delete set null,
  add column response_priority text default 'P2',
  add column control_room_notes text;

alter table geofence_zones
  add column created_by_user_id uuid references users(id) on delete set null;

alter table authority_profiles enable row level security;
alter table authority_responders enable row level security;

create policy "own_authority_profile" on authority_profiles
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own_authority_responders" on authority_responders
  for all using (auth.uid() = authority_user_id)
  with check (auth.uid() = authority_user_id);

create policy "authority_profiles_read_incidents" on safety_incidents
  for select using (
    exists (
      select 1 from authority_profiles
      where authority_profiles.user_id = auth.uid()
    )
  );

create policy "authority_profiles_update_incidents" on safety_incidents
  for update using (
    exists (
      select 1 from authority_profiles
      where authority_profiles.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from authority_profiles
      where authority_profiles.user_id = auth.uid()
    )
  );

create policy "authority_profiles_read_incident_updates" on safety_incident_updates
  for select using (
    exists (
      select 1 from authority_profiles
      where authority_profiles.user_id = auth.uid()
    )
  );

create policy "authority_profiles_insert_incident_updates" on safety_incident_updates
  for insert with check (
    exists (
      select 1 from authority_profiles
      where authority_profiles.user_id = auth.uid()
    )
  );

create policy "authority_profiles_read_safety_profiles" on tourist_safety_profiles
  for select using (
    exists (
      select 1 from authority_profiles
      where authority_profiles.user_id = auth.uid()
    )
  );

create policy "authority_profiles_read_sessions" on safety_sessions
  for select using (
    exists (
      select 1 from authority_profiles
      where authority_profiles.user_id = auth.uid()
    )
  );

create policy "authority_profiles_read_location_pings" on location_pings
  for select using (
    exists (
      select 1 from authority_profiles
      where authority_profiles.user_id = auth.uid()
    )
  );

create policy "authority_profiles_read_geofence_events" on geofence_events
  for select using (
    exists (
      select 1 from authority_profiles
      where authority_profiles.user_id = auth.uid()
    )
  );

create policy "authority_profiles_manage_geofences" on geofence_zones
  for all using (
    exists (
      select 1 from authority_profiles
      where authority_profiles.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from authority_profiles
      where authority_profiles.user_id = auth.uid()
    )
  );

create index on authority_profiles(user_id);
create index on authority_responders(authority_user_id, status);
create index on safety_incidents(status, severity, created_at desc);
create index on safety_incidents(assigned_responder_id);
