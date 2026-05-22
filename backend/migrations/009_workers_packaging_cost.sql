-- Ishchilar oyligi, sessiyaga biriktirish, qadoqlash (salafan/karton) narxi

ALTER TABLE cost_config
  ADD COLUMN IF NOT EXISTS packaging_price_per_meter NUMERIC(12,2) DEFAULT 6000,
  ADD COLUMN IF NOT EXISTS work_minutes_per_month INTEGER DEFAULT 12480;

CREATE TYPE cost_worker_department AS ENUM ('ishlab_chiqarish', 'kesish', 'qadoqlash');

CREATE TABLE cost_workers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       VARCHAR(150) NOT NULL,
  monthly_salary  NUMERIC(14,2) NOT NULL,
  department      cost_worker_department NOT NULL DEFAULT 'ishlab_chiqarish',
  is_active       BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE production_session_workers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES production_sessions(id) ON DELETE CASCADE,
  worker_id       UUID NOT NULL REFERENCES cost_workers(id),
  kg_per_minute   NUMERIC(10,4) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, worker_id)
);

CREATE TABLE cutting_session_workers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES cutting_sessions(id) ON DELETE CASCADE,
  worker_id       UUID NOT NULL REFERENCES cost_workers(id),
  kg_per_minute   NUMERIC(10,4) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, worker_id)
);

ALTER TABLE cut_products
  ADD COLUMN IF NOT EXISTS billing_width_cm NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC(14,2) DEFAULT 0;

ALTER TABLE cutting_sessions
  ADD COLUMN IF NOT EXISTS total_labor_cost NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_packaging_cost NUMERIC(14,2) DEFAULT 0;

ALTER TABLE production_cost_reports
  ADD COLUMN IF NOT EXISTS labor_workers_cost NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packaging_material_cost NUMERIC(14,2) DEFAULT 0;

UPDATE cost_config
SET packaging_price_per_meter = COALESCE(packaging_price_per_meter, 6000),
    work_minutes_per_month = COALESCE(work_minutes_per_month, 12480)
WHERE packaging_price_per_meter IS NULL OR work_minutes_per_month IS NULL;
