INSERT INTO permissions (code, module, action, description) VALUES
('warehouse:read',    'ombor', 'read',   'Tayyor mahsulot omborini ko''rish'),
('warehouse:manage',  'ombor', 'create', 'Tayyor mahsulot qo''shish'),
('shipment:read',     'shipment', 'read',   'Jo''natmalarni ko''rish'),
('shipment:manage',   'shipment', 'create', 'Jo''natma boshqaruvi')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN ('warehouse:read', 'warehouse:manage', 'shipment:read', 'shipment:manage')
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN ('warehouse:read', 'warehouse:manage', 'shipment:read', 'shipment:manage')
WHERE r.name = 'omborchi'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN ('warehouse:read', 'shipment:read', 'shipment:manage')
WHERE r.name = 'kesuvchi_ishchi'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN ('warehouse:read', 'shipment:read')
WHERE r.name = 'direktor'
ON CONFLICT DO NOTHING;
