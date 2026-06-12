-- Seed: global moves library (schema.md → M1 seed, step 3 acceptance).
--
-- Idempotent: stable UUID PKs + INSERT OR IGNORE, so re-running is a no-op and
-- never duplicates or mutates an existing row. This is DATA, not schema — extend
-- the list here without a migration.
--
-- created_at / updated_at use a fixed seed-origin timestamp (2024-01-01T00:00:00Z,
-- epoch ms) so the seed is fully deterministic.

INSERT OR IGNORE INTO moves (id, name, description, template, created_at, updated_at) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Climb',            'Heavy resistance, out of saddle',  'cycle',  1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000002', 'Sprint',           'Max cadence push',                 'cycle',  1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000003', 'Jog',              'Steady seated base',               'cycle',  1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000004', 'Tap Back',         'Out-of-saddle tap to the beat',    'cycle',  1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000005', 'Push',             'Standing climb attack',            'cycle',  1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000006', 'Recovery',         'Active rest / cool-down',          'cycle',  1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000007', 'Jumps',            'In/out of saddle on count',        'cycle',  1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000008', 'Sprint Hold',      'Sustained sprint effort',          'cycle',  1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000009', 'Burpee',           'Full-body floor move',             'hiit',   1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000010', 'Mountain Climber', 'Core/cardio',                      'hiit',   1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000011', 'Squat',            'Lower-body strength',              'sculpt', 1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000012', 'Bicep Curl',       'Weighted arm move',                'sculpt', 1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000013', 'Run',              'Sustained tread pace',             'tread',  1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000014', 'Incline Walk',     'Walking climb',                    'tread',  1704067200000, 1704067200000);
