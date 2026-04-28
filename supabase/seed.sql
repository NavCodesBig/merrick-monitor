-- ============================================================
-- Merrick Monitor — Seed Data
-- Run AFTER schema.sql
-- ============================================================

-- The 5 cabins at Lions Camp Merrick
INSERT INTO cabins (name) VALUES
  ('Seminole'),
  ('Mohawk'),
  ('Iroquois'),
  ('Cherokee'),
  ('Conoy')
ON CONFLICT (name) DO NOTHING;
