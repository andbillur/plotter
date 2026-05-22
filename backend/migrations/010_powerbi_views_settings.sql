-- Power BI Desktop (PostgreSQL) va CRM analitika uchun view'lar

CREATE TABLE IF NOT EXISTS app_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES users(id)
);

INSERT INTO app_settings (key, value) VALUES ('powerbi_embed_url', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value) VALUES ('powerbi_embed_title', 'Plotter CRM — Power BI')
ON CONFLICT (key) DO NOTHING;

-- Kunlik ishlab chiqarish
CREATE OR REPLACE VIEW v_bi_production_daily AS
SELECT
  DATE(ps.finished_at) AS day,
  COUNT(*)::int AS session_count,
  COALESCE(SUM(ps.output_weight_kg), 0) AS output_kg,
  COALESCE(SUM(ps.total_clay_used_kg), 0) AS clay_kg,
  COALESCE(SUM(ps.bobin_used_kg), 0) AS paper_kg,
  COALESCE(AVG(ps.duration_minutes), 0) AS avg_duration_min
FROM production_sessions ps
WHERE ps.status = 'tugallangan' AND ps.finished_at IS NOT NULL
GROUP BY DATE(ps.finished_at);

-- Tannarx (sessiya darajasida)
CREATE OR REPLACE VIEW v_bi_cost_reports AS
SELECT
  pcr.id,
  ps.session_code,
  ps.finished_at,
  pcr.output_weight_kg,
  pcr.paper_cost_total,
  pcr.clay_cost_total,
  pcr.electricity_cost_total,
  pcr.labor_cost_total,
  pcr.labor_workers_cost,
  pcr.other_cost_total,
  pcr.grand_total_cost,
  pcr.cost_per_kg_output,
  pcr.waste_kg,
  pcr.waste_percent
FROM production_cost_reports pcr
JOIN production_sessions ps ON ps.id = pcr.session_id
WHERE ps.status = 'tugallangan';

-- Kesish brak
CREATE OR REPLACE VIEW v_bi_cutting_waste AS
SELECT
  cs.id,
  cs.session_code,
  cs.finished_at,
  cs.input_weight_kg,
  cs.total_output_kg,
  cs.waste_kg,
  cs.waste_percent,
  cs.total_labor_cost,
  cs.total_packaging_cost
FROM cutting_sessions cs
WHERE cs.status = 'tugallangan';

-- Ombor (eni bo'yicha)
CREATE OR REPLACE VIEW v_bi_warehouse_stock AS
SELECT
  COALESCE(cp.billing_width_cm, cp.width_cm) AS width_cm,
  cp.color,
  COUNT(*)::int AS item_count,
  COALESCE(SUM(cp.weight_kg), 0) AS total_kg,
  COALESCE(SUM(cp.packaging_cost), 0) AS packaging_cost_total
FROM cut_products cp
WHERE cp.stock_status = 'omborxonada'
GROUP BY COALESCE(cp.billing_width_cm, cp.width_cm), cp.color;

-- Qadoqlash kunlik
CREATE OR REPLACE VIEW v_bi_packaging_daily AS
SELECT
  DATE(cp.created_at) AS day,
  COUNT(*)::int AS product_count,
  COALESCE(SUM(cp.packaging_cost), 0) AS packaging_cost,
  COALESCE(SUM(cp.weight_kg), 0) AS total_kg
FROM cut_products cp
WHERE cp.packaging_cost > 0
GROUP BY DATE(cp.created_at);
