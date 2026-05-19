-- Default machines, cost config, super_admin user (password: admin123)

INSERT INTO machines (name, machine_type, description)
SELECT * FROM (VALUES
  ('1-liniya Ishlab chiqarish', 'production', 'Asosiy plotter liniyasi'),
  ('2-liniya Ishlab chiqarish', 'production', 'Zaxira liniya'),
  ('Kesish Mashina-1', 'cutting', 'Kesuvchi stansiya 1')
) AS v(name, machine_type, description)
WHERE NOT EXISTS (SELECT 1 FROM machines LIMIT 1);

INSERT INTO cost_config (paper_price_per_kg, clay_price_per_kg, electricity_cost_per_kg, labor_cost_per_kg, other_cost_per_kg)
SELECT 3500, 8000, 150, 200, 0
WHERE NOT EXISTS (SELECT 1 FROM cost_config LIMIT 1);

-- admin user: npm run seed (scripts/seed.js)
