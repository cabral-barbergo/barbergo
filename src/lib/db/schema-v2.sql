-- ============================================================
-- Schema v2: slot-based availability and blocking
-- Run manually in Supabase SQL editor
-- ============================================================

-- Drop old tables (optional — keep if you want to migrate data first)
-- DROP TABLE IF EXISTS availability CASCADE;
-- DROP TABLE IF EXISTS blocked_days CASCADE;

-- ============================================================
-- availability_slots: active/inactive slots per day of week
-- day_of_week: 0=lunes, 1=martes, 2=miércoles, 3=jueves, 4=viernes
-- ============================================================
CREATE TABLE IF NOT EXISTS availability_slots (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week           int2 NOT NULL CHECK (day_of_week BETWEEN 0 AND 4),
  slot                  time NOT NULL,
  is_active             bool NOT NULL DEFAULT true,
  slot_duration_minutes int  NOT NULL DEFAULT 30,
  UNIQUE (day_of_week, slot)
);

-- ============================================================
-- blocked_slots: specific slots blocked for a particular date
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_slots (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date   date NOT NULL,
  slot   time NOT NULL,
  reason text,
  UNIQUE (date, slot)
);

-- ============================================================
-- Seed data: lunes–viernes, mañana + tarde, cada 30 min
-- Morning  08:30–12:00  → active
-- Lunch    12:30–14:00  → inactive
-- Afternoon 14:30–17:30 → active
-- ============================================================

-- Helper: generate all rows for days 0-4
INSERT INTO availability_slots (day_of_week, slot, is_active) VALUES
  -- LUNES (0)
  (0,'08:30',true),(0,'09:00',true),(0,'09:30',true),(0,'10:00',true),
  (0,'10:30',true),(0,'11:00',true),(0,'11:30',true),(0,'12:00',true),
  (0,'12:30',false),(0,'13:00',false),(0,'13:30',false),(0,'14:00',false),
  (0,'14:30',true),(0,'15:00',true),(0,'15:30',true),(0,'16:00',true),
  (0,'16:30',true),(0,'17:00',true),(0,'17:30',true),

  -- MARTES (1)
  (1,'08:30',true),(1,'09:00',true),(1,'09:30',true),(1,'10:00',true),
  (1,'10:30',true),(1,'11:00',true),(1,'11:30',true),(1,'12:00',true),
  (1,'12:30',false),(1,'13:00',false),(1,'13:30',false),(1,'14:00',false),
  (1,'14:30',true),(1,'15:00',true),(1,'15:30',true),(1,'16:00',true),
  (1,'16:30',true),(1,'17:00',true),(1,'17:30',true),

  -- MIÉRCOLES (2)
  (2,'08:30',true),(2,'09:00',true),(2,'09:30',true),(2,'10:00',true),
  (2,'10:30',true),(2,'11:00',true),(2,'11:30',true),(2,'12:00',true),
  (2,'12:30',false),(2,'13:00',false),(2,'13:30',false),(2,'14:00',false),
  (2,'14:30',true),(2,'15:00',true),(2,'15:30',true),(2,'16:00',true),
  (2,'16:30',true),(2,'17:00',true),(2,'17:30',true),

  -- JUEVES (3)
  (3,'08:30',true),(3,'09:00',true),(3,'09:30',true),(3,'10:00',true),
  (3,'10:30',true),(3,'11:00',true),(3,'11:30',true),(3,'12:00',true),
  (3,'12:30',false),(3,'13:00',false),(3,'13:30',false),(3,'14:00',false),
  (3,'14:30',true),(3,'15:00',true),(3,'15:30',true),(3,'16:00',true),
  (3,'16:30',true),(3,'17:00',true),(3,'17:30',true),

  -- VIERNES (4)
  (4,'08:30',true),(4,'09:00',true),(4,'09:30',true),(4,'10:00',true),
  (4,'10:30',true),(4,'11:00',true),(4,'11:30',true),(4,'12:00',true),
  (4,'12:30',false),(4,'13:00',false),(4,'13:30',false),(4,'14:00',false),
  (4,'14:30',true),(4,'15:00',true),(4,'15:30',true),(4,'16:00',true),
  (4,'16:30',true),(4,'17:00',true),(4,'17:30',true)

ON CONFLICT (day_of_week, slot) DO NOTHING;
