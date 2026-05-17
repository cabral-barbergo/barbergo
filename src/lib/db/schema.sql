-- bookings
create table bookings (
  id          uuid primary key default gen_random_uuid(),
  token       uuid unique not null default gen_random_uuid(),
  date        date not null,
  slot        time not null,
  client_name text not null,
  client_phone text not null,
  address     text not null,
  lat         float8 not null,
  lon         float8 not null,
  service_id  text not null,
  status      text not null default 'confirmed',
  created_at  timestamptz not null default now()
);

-- availability
create table availability (
  id          uuid primary key default gen_random_uuid(),
  day_of_week int2 not null, -- 0 = lunes, 6 = domingo
  start_time  time not null,
  end_time    time not null,
  is_active   bool not null default true
);

insert into availability (day_of_week, start_time, end_time) values
  (0, '09:00', '18:00'),
  (1, '09:00', '18:00'),
  (2, '09:00', '18:00'),
  (3, '09:00', '18:00'),
  (4, '09:00', '18:00'),
  (5, '09:00', '18:00');

-- blocked_days
create table blocked_days (
  id     uuid primary key default gen_random_uuid(),
  date   date unique not null,
  reason text
);
