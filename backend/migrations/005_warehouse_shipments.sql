-- Tayyor mahsulot ombori va jo'natmalar

CREATE TYPE product_stock_status AS ENUM (
    'kesildi',
    'plotda',
    'omborxonada',
    'jo_natilgan'
);

CREATE TYPE shipment_status AS ENUM (
    'tayyorlanmoqda',
    'jo_natilgan',
    'yetkazilgan'
);

ALTER TABLE cut_products
    ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'white',
    ADD COLUMN IF NOT EXISTS stock_status product_stock_status DEFAULT 'kesildi';

ALTER TABLE cut_products
    ALTER COLUMN cutting_session_id DROP NOT NULL,
    ALTER COLUMN parent_paper_id DROP NOT NULL;

CREATE TABLE shipments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_code   VARCHAR(50) NOT NULL UNIQUE,
    destination     VARCHAR(255),
    customer_name   VARCHAR(150),
    notes           TEXT,
    status          shipment_status DEFAULT 'tayyorlanmoqda',
    total_items     INTEGER DEFAULT 0,
    total_weight_kg NUMERIC(10,3) DEFAULT 0,
    created_by      UUID REFERENCES users(id),
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shipment_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id     UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    cut_product_id  UUID NOT NULL REFERENCES cut_products(id),
    qr_code         VARCHAR(100) NOT NULL,
    weight_kg       NUMERIC(10,3) NOT NULL,
    width_cm        NUMERIC(8,2),
    color           VARCHAR(50),
    scanned_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (shipment_id, cut_product_id)
);

CREATE SEQUENCE shipment_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_shipment_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'SHP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('shipment_code_seq')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE INDEX idx_cut_products_stock ON cut_products(stock_status);
CREATE INDEX idx_shipment_items_shipment ON shipment_items(shipment_id);
