-- Ishlab chiqarish: m/min (metr/daqiqa), kesish: kg/min

ALTER TABLE production_session_workers
  ADD COLUMN IF NOT EXISTS meters_per_minute NUMERIC(10,4);

UPDATE production_session_workers
SET meters_per_minute = kg_per_minute
WHERE meters_per_minute IS NULL AND kg_per_minute IS NOT NULL;

ALTER TABLE production_cost_reports
  ADD COLUMN IF NOT EXISTS output_meters NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS labor_cost_per_meter NUMERIC(12,4);
