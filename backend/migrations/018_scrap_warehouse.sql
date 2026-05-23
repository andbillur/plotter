-- Brak (qayta ishlatiladi) va makulatura/otxod (sotiladi, ishlatilmaydi) omborlari

CREATE TYPE scrap_warehouse_type AS ENUM ('brak', 'makulatura');

CREATE TYPE scrap_movement_type AS ENUM (
  'kirim',
  'kirim_savdo',
  'chiqim',
  'chiqim_sotish',
  'chiqim_ishlatish',
  'kesishdan'
);

CREATE TABLE scrap_stock (
  warehouse_type    scrap_warehouse_type PRIMARY KEY,
  current_weight_kg NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (current_weight_kg >= 0),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO scrap_stock (warehouse_type, current_weight_kg) VALUES
  ('brak', 0),
  ('makulatura', 0);

CREATE TABLE scrap_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_type      scrap_warehouse_type NOT NULL,
  movement_type       scrap_movement_type NOT NULL,
  quantity_kg         NUMERIC(12,3) NOT NULL CHECK (quantity_kg > 0),
  price_per_kg        NUMERIC(12,2),
  total_amount        NUMERIC(14,2),
  balance_after_kg    NUMERIC(14,3),
  cutting_session_id  UUID REFERENCES cutting_sessions(id),
  counterparty        VARCHAR(200),
  notes               TEXT,
  performed_by        UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scrap_tx_warehouse ON scrap_transactions(warehouse_type, created_at DESC);
CREATE INDEX idx_scrap_tx_cutting ON scrap_transactions(cutting_session_id);

ALTER TABLE cutting_sessions
  ADD COLUMN IF NOT EXISTS waste_brak_kg NUMERIC(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waste_makulatura_kg NUMERIC(12,3) NOT NULL DEFAULT 0;

-- Ruxsatlar
INSERT INTO permissions (code, module, action, description) VALUES
  ('scrap:read', 'scrap', 'read', 'Brak/makulatura omborini ko''rish'),
  ('scrap:manage', 'scrap', 'create', 'Brak/makulatura kirim-chiqim')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN ('scrap:read', 'scrap:manage')
WHERE r.name IN ('super_admin', 'omborchi')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code = 'scrap:read'
WHERE r.name IN ('direktor', 'kesuvchi_ishchi', 'mashina_operatori')
ON CONFLICT DO NOTHING;
