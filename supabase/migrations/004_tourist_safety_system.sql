-- Tourist Safety Monitoring & Incident Response

create table tourist_safety_profiles (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid unique not null references users(id) on delete cascade,
  full_name                  text not null,
  phone                      text,
  emergency_contact_name     text,
  emergency_contact_phone    text,
  blood_group                text,
  medical_notes              text,
  home_country               text default 'IN',
  digital_id_code            text unique not null,
  is_location_sharing_enabled boolean default true,
  created_at                 timestamptz default now(),
  updated_at                 timestamptz default now()
);

create table geofence_zones (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  zone_type       text not null default 'caution',
  severity        text not null default 'medium',
  city            text,
  state           text,
  country         text default 'India',
  center_lat      numeric(10,7) not null,
  center_lng      numeric(10,7) not null,
  radius_meters   int not null,
  safety_message  text not null,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

create table safety_sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references users(id) on delete cascade,
  trip_id               uuid references trips(id) on delete set null,
  status                text default 'active',
  risk_level            text default 'green',
  started_at            timestamptz default now(),
  ended_at              timestamptz,
  last_lat              numeric(10,7),
  last_lng              numeric(10,7),
  last_location_at      timestamptz,
  last_check_in_at      timestamptz,
  last_geofence_zone_id uuid references geofence_zones(id),
  consent_snapshot      jsonb default '{}'
);

create table location_pings (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references safety_sessions(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  lat             numeric(10,7) not null,
  lng             numeric(10,7) not null,
  accuracy_meters numeric(8,2),
  source          text default 'manual_check_in',
  created_at      timestamptz default now()
);

create table geofence_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references safety_sessions(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  zone_id     uuid references geofence_zones(id) on delete cascade,
  event_type  text not null default 'inside',
  lat         numeric(10,7),
  lng         numeric(10,7),
  created_at  timestamptz default now()
);

create table safety_incidents (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references users(id) on delete cascade,
  session_id               uuid references safety_sessions(id) on delete set null,
  trip_id                  uuid references trips(id) on delete set null,
  incident_type            text not null default 'sos',
  severity                 text not null default 'high',
  status                   text not null default 'reported',
  description              text,
  lat                      numeric(10,7),
  lng                      numeric(10,7),
  location_accuracy_meters numeric(8,2),
  ai_summary               text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create table safety_incident_updates (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references safety_incidents(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  status      text not null,
  note        text,
  created_at  timestamptz default now()
);

alter table tourist_safety_profiles enable row level security;
alter table geofence_zones enable row level security;
alter table safety_sessions enable row level security;
alter table location_pings enable row level security;
alter table geofence_events enable row level security;
alter table safety_incidents enable row level security;
alter table safety_incident_updates enable row level security;

create policy "own_safety_profiles" on tourist_safety_profiles
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "geofence_read" on geofence_zones
  for select using (is_active = true);

create policy "own_safety_sessions" on safety_sessions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own_location_pings" on location_pings
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own_geofence_events" on geofence_events
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own_safety_incidents" on safety_incidents
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own_safety_incident_updates" on safety_incident_updates
  for select using (
    exists (
      select 1 from safety_incidents
      where safety_incidents.id = safety_incident_updates.incident_id
      and safety_incidents.user_id = auth.uid()
    )
  );

create policy "insert_own_safety_incident_updates" on safety_incident_updates
  for insert with check (
    exists (
      select 1 from safety_incidents
      where safety_incidents.id = safety_incident_updates.incident_id
      and safety_incidents.user_id = auth.uid()
    )
  );

create index on tourist_safety_profiles(user_id);
create index on safety_sessions(user_id, status);
create index on location_pings(user_id, created_at desc);
create index on geofence_events(user_id, created_at desc);
create index on safety_incidents(user_id, created_at desc);
create index on geofence_zones(city, state, is_active);

insert into geofence_zones
  (name, zone_type, severity, city, state, center_lat, center_lng, radius_meters, safety_message)
values
  (
    'Shillong late-night caution corridor',
    'caution',
    'medium',
    'Shillong',
    'Meghalaya',
    25.5788,
    91.8933,
    1800,
    'Stay on lit roads, prefer verified transport, and share live location after dark.'
  ),
  (
    'Cherrapunji waterfall edge buffer',
    'hazard',
    'high',
    'Cherrapunji',
    'Meghalaya',
    25.2702,
    91.7323,
    2200,
    'Slippery terrain and sudden weather changes. Avoid isolated trails and check in before moving ahead.'
  ),
  (
    'Tawang mountain road advisory',
    'route_risk',
    'high',
    'Tawang',
    'Arunachal Pradesh',
    27.5861,
    91.8594,
    3500,
    'Mountain road risk zone. Confirm daylight travel, vehicle condition, and network availability.'
  ),
  (
    'Kaziranga wildlife perimeter',
    'restricted',
    'critical',
    'Kaziranga',
    'Assam',
    26.5775,
    93.1711,
    5000,
    'Protected wildlife area. Stay on approved routes and contact local authorities if disoriented.'
  ),
  (
    'Gangtok low-connectivity hill route',
    'low_network',
    'medium',
    'Gangtok',
    'Sikkim',
    27.3389,
    88.6065,
    3000,
    'Network may drop on hill routes. Download offline details and send a check-in before departure.'
  );
