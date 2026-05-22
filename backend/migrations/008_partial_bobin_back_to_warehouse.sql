-- Qisman ishlatilgan bobinlar: qoldiq bor bo'lsa yana omborda

UPDATE bobins
SET status = 'omborxonada', updated_at = NOW()
WHERE status = 'ishlatilgan'
  AND current_weight_kg > 0.01;
