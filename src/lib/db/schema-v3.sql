-- schema-v3.sql: service zone polygon for isolated client projection
-- Run manually in Supabase SQL editor

CREATE TABLE service_zone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'main',
  center_lat float8 NOT NULL,
  center_lon float8 NOT NULL,
  polygon jsonb NOT NULL, -- array de [lat, lon]: [[lat,lon],[lat,lon],...]
  updated_at timestamptz DEFAULT now()
);

-- Default zone: center of Mercedes, BA + large rectangular polygon
INSERT INTO service_zone (name, center_lat, center_lon, polygon) VALUES (
  'main',
  -34.6519,
  -59.4307,
  '[[-34.62,-59.46],[-34.62,-59.40],[-34.68,-59.40],[-34.68,-59.46]]'::jsonb
);
