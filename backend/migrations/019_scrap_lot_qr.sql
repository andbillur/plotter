-- Brak / makulatura etiketlari (BRK-..., MAK-...)

CREATE TABLE scrap_lots (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code               VARCHAR(64) NOT NULL UNIQUE,
  warehouse_type        scrap_warehouse_type NOT NULL,
  weight_kg             NUMERIC(12,3) NOT NULL CHECK (weight_kg > 0),
  status                VARCHAR(24) NOT NULL DEFAULT 'omborxona'
                        CHECK (status IN ('omborxona', 'chiqilgan', 'sotilgan', 'ishlatilgan')),
  in_transaction_id     UUID REFERENCES scrap_transactions(id) ON DELETE SET NULL,
  out_transaction_id    UUID REFERENCES scrap_transactions(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scrap_lots_warehouse ON scrap_lots(warehouse_type, status);
CREATE INDEX idx_scrap_lots_qr ON scrap_lots(qr_code);

ALTER TABLE scrap_transactions
  ADD COLUMN IF NOT EXISTS qr_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS scrap_lot_id UUID REFERENCES scrap_lots(id);
