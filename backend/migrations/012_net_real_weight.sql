-- Net (standart eni bo'yicha) va real (tarozi) og'irlik

ALTER TABLE cut_products
  ADD COLUMN IF NOT EXISTS net_weight_kg NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS real_weight_kg NUMERIC(10,3);

UPDATE cut_products
SET net_weight_kg = weight_kg
WHERE net_weight_kg IS NULL AND weight_kg IS NOT NULL;
