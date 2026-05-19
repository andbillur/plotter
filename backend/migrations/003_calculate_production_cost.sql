CREATE OR REPLACE FUNCTION calculate_production_cost(p_session_id UUID)
RETURNS TABLE (
    paper_used_kg           NUMERIC,
    clay_used_kg            NUMERIC,
    output_kg               NUMERIC,
    clay_ratio              NUMERIC,
    paper_ratio             NUMERIC,
    paper_cost              NUMERIC,
    clay_cost               NUMERIC,
    electricity_cost        NUMERIC,
    labor_cost              NUMERIC,
    other_cost              NUMERIC,
    grand_total             NUMERIC,
    cost_per_kg             NUMERIC,
    waste_kg                NUMERIC,
    waste_percent           NUMERIC
) AS $$
DECLARE
    v_session   production_sessions%ROWTYPE;
    v_config    cost_config%ROWTYPE;
    v_paper_used NUMERIC;
    v_clay_used  NUMERIC;
    v_output     NUMERIC;
BEGIN
    SELECT * INTO v_session FROM production_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Sessiya topilmadi: %', p_session_id; END IF;

    SELECT * INTO v_config FROM cost_config ORDER BY valid_from DESC LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Narx konfiguratsiyasi kiritilmagan'; END IF;

    v_paper_used := v_session.bobin_used_kg;
    v_clay_used  := v_session.total_clay_used_kg;
    v_output     := v_session.output_weight_kg;

    IF v_output IS NULL OR v_output = 0 THEN
        RAISE EXCEPTION 'Tayyor mahsulot og''irligi kiritilmagan (FINISH qilinmagan)';
    END IF;

    RETURN QUERY SELECT
        v_paper_used,
        v_clay_used,
        v_output,
        ROUND(v_clay_used / v_output, 4),
        ROUND(v_paper_used / v_output, 4),
        ROUND(v_paper_used * v_config.paper_price_per_kg, 2),
        ROUND(v_clay_used * v_config.clay_price_per_kg, 2),
        ROUND(v_output * v_config.electricity_cost_per_kg, 2),
        ROUND(v_output * v_config.labor_cost_per_kg, 2),
        ROUND(v_output * v_config.other_cost_per_kg, 2),
        ROUND(
            v_paper_used * v_config.paper_price_per_kg +
            v_clay_used * v_config.clay_price_per_kg +
            v_output * v_config.electricity_cost_per_kg +
            v_output * v_config.labor_cost_per_kg +
            v_output * v_config.other_cost_per_kg,
        2),
        ROUND((
            v_paper_used * v_config.paper_price_per_kg +
            v_clay_used * v_config.clay_price_per_kg +
            v_output * v_config.electricity_cost_per_kg +
            v_output * v_config.labor_cost_per_kg +
            v_output * v_config.other_cost_per_kg
        ) / v_output, 4),
        GREATEST(0, (v_paper_used + v_clay_used) - v_output),
        CASE
            WHEN (v_paper_used + v_clay_used) > 0
            THEN ROUND(
                GREATEST(0, (v_paper_used + v_clay_used) - v_output) /
                (v_paper_used + v_clay_used) * 100, 2)
            ELSE 0
        END;
END;
$$ LANGUAGE plpgsql;
