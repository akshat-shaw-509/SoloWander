-- Offline-first SOS metadata and idempotency

alter table safety_incidents
  add column if not exists client_sos_id text,
  add column if not exists location_source text default 'UNAVAILABLE',
  add column if not exists location_timestamp timestamptz,
  add column if not exists location_confidence numeric(4,3) default 0,
  add column if not exists sync_status text default 'SENT',
  add column if not exists device_info jsonb default '{}',
  add column if not exists search_area jsonb;

create unique index if not exists safety_incidents_client_sos_id_unique
  on safety_incidents(client_sos_id)
  where client_sos_id is not null;

create index if not exists safety_incidents_location_source_idx
  on safety_incidents(location_source, created_at desc);
