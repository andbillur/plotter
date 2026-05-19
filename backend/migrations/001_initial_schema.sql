-- Plotter CRM — Initial schema v1.0.0
-- PostgreSQL 16+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM (
    'super_admin',
    'omborchi',
    'mashina_operatori',
    'kesuvchi_ishchi',
    'direktor'
);

CREATE TYPE bobin_status AS ENUM (
    'omborxonada',
    'mashinada',
    'ishlatilgan',
    'qaytarilgan'
);

CREATE TYPE session_status AS ENUM (
    'boshlangan',
    'tugallangan',
    'bekor_qilingan'
);

CREATE TYPE plot_status AS ENUM (
    'ochiq',
    'yopiq'
);

CREATE TYPE clay_operation AS ENUM (
    'kirim',
    'chiqim',
    'qoʻshildi'
);

-- 1. Users & RBAC
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        user_role NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(100) NOT NULL UNIQUE,
    module      VARCHAR(50) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id        UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id  UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(150) NOT NULL,
    username        VARCHAR(50) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role_id         UUID NOT NULL REFERENCES roles(id),
    phone           VARCHAR(20),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token   TEXT NOT NULL UNIQUE,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name, display_name, description) VALUES
('super_admin',       'Super Admin',         'Barcha amallarga to''liq kirish'),
('omborchi',          'Omborchi',            'Xomashyo kirim/chiqimini boshqarish'),
('mashina_operatori', 'Mashina Operatori',   'Start/Finish va kley boshqaruvi'),
('kesuvchi_ishchi',   'Kesuvchi Ishchi',     'Kesish, PLOT yaratish'),
('direktor',          'Direktor / Analitik', 'Faqat hisobotlar va analitika');

-- 2. Machines
CREATE TABLE machines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    machine_type    VARCHAR(50) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bobins
CREATE TABLE bobins (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code             VARCHAR(100) NOT NULL UNIQUE,
    grammaj             NUMERIC(6,2) NOT NULL,
    color               VARCHAR(50) DEFAULT 'white',
    initial_weight_kg   NUMERIC(10,3) NOT NULL,
    current_weight_kg   NUMERIC(10,3) NOT NULL,
    initial_length_m    NUMERIC(10,2) NOT NULL,
    current_length_m    NUMERIC(10,2) NOT NULL,
    width_mm            NUMERIC(8,2),
    status              bobin_status DEFAULT 'omborxonada',
    current_machine_id  UUID REFERENCES machines(id),
    supplier_name       VARCHAR(150),
    batch_number        VARCHAR(100),
    received_at         TIMESTAMPTZ DEFAULT NOW(),
    received_by         UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE VIEW v_bobin_stock AS
SELECT
    COUNT(*) AS total_bobins,
    SUM(current_weight_kg) AS total_weight_kg,
    SUM(current_length_m) AS total_length_m,
    grammaj,
    color,
    COUNT(*) FILTER (WHERE status = 'omborxonada') AS available_count,
    COUNT(*) FILTER (WHERE status = 'mashinada') AS in_machine_count
FROM bobins
GROUP BY grammaj, color;

CREATE TABLE bobin_transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bobin_id        UUID NOT NULL REFERENCES bobins(id),
    transaction_type VARCHAR(30) NOT NULL,
    weight_change_kg NUMERIC(10,3),
    length_change_m  NUMERIC(10,2),
    reason          TEXT,
    performed_by    UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Clay
CREATE TABLE clay_inventory (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_stock_kg NUMERIC(10,3) NOT NULL DEFAULT 0,
    bag_weight_kg   NUMERIC(6,2) NOT NULL DEFAULT 20.00,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO clay_inventory (current_stock_kg) VALUES (0);

CREATE TABLE clay_transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation       clay_operation NOT NULL,
    quantity_bags   INTEGER,
    quantity_kg     NUMERIC(10,3) NOT NULL,
    balance_after_kg NUMERIC(10,3) NOT NULL,
    production_session_id UUID,
    notes           TEXT,
    performed_by    UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Production sessions
CREATE TABLE production_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_code        VARCHAR(50) NOT NULL UNIQUE,
    bobin_id            UUID NOT NULL REFERENCES bobins(id),
    machine_id          UUID NOT NULL REFERENCES machines(id),
    operator_id         UUID NOT NULL REFERENCES users(id),
    bobin_weight_at_start_kg  NUMERIC(10,3) NOT NULL,
    bobin_weight_at_finish_kg NUMERIC(10,3),
    bobin_used_kg       NUMERIC(10,3) GENERATED ALWAYS AS (
        bobin_weight_at_start_kg - COALESCE(bobin_weight_at_finish_kg, bobin_weight_at_start_kg)
    ) STORED,
    total_clay_used_kg  NUMERIC(10,3) DEFAULT 0,
    output_weight_kg    NUMERIC(10,3),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at         TIMESTAMPTZ,
    duration_minutes    INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (finished_at - started_at))::INTEGER / 60
    ) STORED,
    status              session_status DEFAULT 'boshlangan',
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clay_transactions
    ADD CONSTRAINT fk_clay_session
    FOREIGN KEY (production_session_id) REFERENCES production_sessions(id);

CREATE TABLE session_clay_additions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id          UUID NOT NULL REFERENCES production_sessions(id),
    quantity_kg         NUMERIC(10,3) NOT NULL,
    cumulative_kg       NUMERIC(10,3) NOT NULL,
    added_by            UUID REFERENCES users(id),
    added_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE session_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'PS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('session_code_seq')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 6. Parent papers
CREATE TABLE parent_papers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code             VARCHAR(100) NOT NULL UNIQUE,
    source_session_id   UUID REFERENCES production_sessions(id),
    parent_paper_id     UUID REFERENCES parent_papers(id),
    inheritance_level   INTEGER DEFAULT 1,
    weight_kg           NUMERIC(10,3) NOT NULL,
    initial_weight_kg   NUMERIC(10,3) NOT NULL,
    clay_share_kg       NUMERIC(10,3),
    cost_per_kg         NUMERIC(12,4),
    total_cost          NUMERIC(14,2),
    is_cut              BOOLEAN DEFAULT FALSE,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE paper_lineage (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ancestor_id     UUID NOT NULL REFERENCES parent_papers(id),
    descendant_id   UUID NOT NULL REFERENCES parent_papers(id),
    depth           INTEGER NOT NULL,
    UNIQUE (ancestor_id, descendant_id)
);

-- 7. Cutting
CREATE TABLE cutting_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_code        VARCHAR(50) NOT NULL UNIQUE,
    parent_paper_id     UUID NOT NULL REFERENCES parent_papers(id),
    machine_id          UUID REFERENCES machines(id),
    cutter_id           UUID NOT NULL REFERENCES users(id),
    input_weight_kg     NUMERIC(10,3) NOT NULL,
    total_output_kg     NUMERIC(10,3) DEFAULT 0,
    waste_kg            NUMERIC(10,3) GENERATED ALWAYS AS (
        input_weight_kg - COALESCE(total_output_kg, 0)
    ) STORED,
    waste_percent       NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN input_weight_kg > 0
            THEN ROUND(((input_weight_kg - COALESCE(total_output_kg, 0)) / input_weight_kg * 100)::NUMERIC, 2)
            ELSE 0
        END
    ) STORED,
    status              session_status DEFAULT 'boshlangan',
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    finished_at         TIMESTAMPTZ,
    notes               TEXT
);

CREATE TABLE cut_products (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code             VARCHAR(100) UNIQUE,
    cutting_session_id  UUID NOT NULL REFERENCES cutting_sessions(id),
    parent_paper_id     UUID NOT NULL REFERENCES parent_papers(id),
    width_cm            NUMERIC(8,2) NOT NULL,
    weight_kg           NUMERIC(10,3) NOT NULL,
    length_m            NUMERIC(10,2),
    plot_id             UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE cutting_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_cutting_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'CS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('cutting_code_seq')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 8. Plots
CREATE TABLE plots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plot_number     VARCHAR(50) NOT NULL UNIQUE,
    width_cm        NUMERIC(8,2) NOT NULL,
    total_items     INTEGER DEFAULT 0,
    total_weight_kg NUMERIC(10,3) DEFAULT 0,
    status          plot_status DEFAULT 'ochiq',
    opened_at       TIMESTAMPTZ DEFAULT NOW(),
    closed_at       TIMESTAMPTZ,
    opened_by       UUID REFERENCES users(id),
    closed_by       UUID REFERENCES users(id),
    notes           TEXT
);

ALTER TABLE cut_products
    ADD CONSTRAINT fk_cut_products_plot
    FOREIGN KEY (plot_id) REFERENCES plots(id);

CREATE SEQUENCE plot_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_plot_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'PLOT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('plot_code_seq')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE VIEW v_plot_summary AS
SELECT
    p.id,
    p.plot_number,
    p.width_cm,
    p.status,
    p.opened_at,
    p.closed_at,
    COUNT(cp.id) AS item_count,
    SUM(cp.weight_kg) AS total_weight_kg,
    AVG(cp.weight_kg) AS avg_item_weight_kg,
    MIN(cp.weight_kg) AS min_item_weight_kg,
    MAX(cp.weight_kg) AS max_item_weight_kg
FROM plots p
LEFT JOIN cut_products cp ON cp.plot_id = p.id
GROUP BY p.id, p.plot_number, p.width_cm, p.status, p.opened_at, p.closed_at;

-- 9. Cost config
CREATE TABLE cost_config (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_price_per_kg      NUMERIC(12,2) NOT NULL,
    clay_price_per_kg       NUMERIC(12,2) NOT NULL,
    electricity_cost_per_kg NUMERIC(12,2) DEFAULT 0,
    labor_cost_per_kg       NUMERIC(12,2) DEFAULT 0,
    other_cost_per_kg       NUMERIC(12,2) DEFAULT 0,
    currency                VARCHAR(10) DEFAULT 'UZS',
    valid_from              TIMESTAMPTZ DEFAULT NOW(),
    created_by              UUID REFERENCES users(id),
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE production_cost_reports (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id                  UUID NOT NULL REFERENCES production_sessions(id),
    cost_config_id              UUID NOT NULL REFERENCES cost_config(id),
    paper_used_kg               NUMERIC(10,3) NOT NULL,
    clay_used_kg                NUMERIC(10,3) NOT NULL,
    output_weight_kg            NUMERIC(10,3) NOT NULL,
    clay_per_kg_paper           NUMERIC(8,4),
    paper_cost_total            NUMERIC(14,2),
    clay_cost_total             NUMERIC(14,2),
    electricity_cost_total      NUMERIC(14,2),
    labor_cost_total            NUMERIC(14,2),
    other_cost_total            NUMERIC(14,2),
    grand_total_cost            NUMERIC(14,2),
    cost_per_kg_output          NUMERIC(12,4),
    waste_kg                    NUMERIC(10,3),
    waste_percent               NUMERIC(5,2),
    calculated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Audit
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    table_name      VARCHAR(100) NOT NULL,
    record_id       UUID,
    action          VARCHAR(20) NOT NULL,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- 11. Indexes
CREATE INDEX idx_bobins_qr ON bobins(qr_code);
CREATE INDEX idx_bobins_status ON bobins(status);
CREATE INDEX idx_bobins_machine ON bobins(current_machine_id);
CREATE INDEX idx_prod_sessions_bobin ON production_sessions(bobin_id);
CREATE INDEX idx_prod_sessions_status ON production_sessions(status);
CREATE INDEX idx_prod_sessions_date ON production_sessions(started_at DESC);
CREATE INDEX idx_parent_papers_qr ON parent_papers(qr_code);
CREATE INDEX idx_parent_papers_session ON parent_papers(source_session_id);
CREATE INDEX idx_cutting_parent ON cutting_sessions(parent_paper_id);
CREATE INDEX idx_cut_products_plot ON cut_products(plot_id);
CREATE INDEX idx_clay_txn_session ON clay_transactions(production_session_id);
CREATE INDEX idx_clay_txn_date ON clay_transactions(created_at DESC);
CREATE INDEX idx_plots_status ON plots(status);
CREATE INDEX idx_plots_date ON plots(opened_at DESC);

-- 12. Triggers
CREATE OR REPLACE FUNCTION trg_bobin_to_machine()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'mashinada' AND OLD.status != 'mashinada' THEN
        INSERT INTO bobin_transactions(bobin_id, transaction_type, weight_change_kg, reason, performed_by)
        VALUES (NEW.id, 'chiqim', 0, 'Mashinaga o''rnatildi', NEW.received_by);
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bobin_status_change
BEFORE UPDATE ON bobins
FOR EACH ROW EXECUTE FUNCTION trg_bobin_to_machine();

CREATE OR REPLACE FUNCTION trg_update_clay_inventory()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.operation IN ('kirim') THEN
        UPDATE clay_inventory SET
            current_stock_kg = current_stock_kg + NEW.quantity_kg,
            updated_at = NOW();
    ELSIF NEW.operation IN ('chiqim', 'qoʻshildi') THEN
        UPDATE clay_inventory SET
            current_stock_kg = current_stock_kg - NEW.quantity_kg,
            updated_at = NOW();
    END IF;
    SELECT current_stock_kg INTO NEW.balance_after_kg FROM clay_inventory LIMIT 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clay_inventory_update
BEFORE INSERT ON clay_transactions
FOR EACH ROW EXECUTE FUNCTION trg_update_clay_inventory();

CREATE OR REPLACE FUNCTION trg_update_plot_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.plot_id IS NOT NULL THEN
        UPDATE plots SET
            total_items = total_items + 1,
            total_weight_kg = total_weight_kg + NEW.weight_kg
        WHERE id = NEW.plot_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.plot_id IS DISTINCT FROM OLD.plot_id THEN
        IF OLD.plot_id IS NOT NULL THEN
            UPDATE plots SET total_items = total_items - 1,
                total_weight_kg = total_weight_kg - OLD.weight_kg WHERE id = OLD.plot_id;
        END IF;
        IF NEW.plot_id IS NOT NULL THEN
            UPDATE plots SET total_items = total_items + 1,
                total_weight_kg = total_weight_kg + NEW.weight_kg WHERE id = NEW.plot_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plot_totals
AFTER INSERT OR UPDATE ON cut_products
FOR EACH ROW EXECUTE FUNCTION trg_update_plot_totals();
