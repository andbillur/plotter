-- Ish haqi: oylik / (30×24×60) — foydalanuvchi formulasi

UPDATE cost_config
SET work_minutes_per_month = 43200
WHERE work_minutes_per_month IS NULL OR work_minutes_per_month = 12480;
