-- 0 kg yoki 0 m qolgan bobinlar omborda bo'lmasin

UPDATE bobins
SET status = 'ishlatilgan',
    current_length_m = 0,
    updated_at = NOW()
WHERE status = 'omborxonada'
  AND current_weight_kg <= 0.01;

UPDATE bobins
SET status = 'ishlatilgan',
    updated_at = NOW()
WHERE status = 'omborxonada'
  AND current_length_m <= 0.01;
