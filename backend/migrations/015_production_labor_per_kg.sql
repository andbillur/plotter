-- Ishlab chiqarish: ish haqi 1 kg uchun (asosiy tannarx)

ALTER TABLE production_cost_reports
  ADD COLUMN IF NOT EXISTS labor_cost_per_kg NUMERIC(12,4);
