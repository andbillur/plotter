-- Eski kg/min qiymatlari m/min sifatida ishlatilmasin

UPDATE production_session_workers
SET kg_per_minute = 0
WHERE kg_per_minute IS NOT NULL AND kg_per_minute > 0;
