-- Permissions & role_permissions seed

INSERT INTO permissions (code, module, action, description) VALUES
('bobin:create',          'ombor', 'create', 'Bobin qo''shish'),
('bobin:read',            'ombor', 'read',   'Bobinlarni ko''rish'),
('bobin:update',          'ombor', 'update', 'Bobin tahrirlash'),
('clay:create',           'ombor', 'create', 'Kley kirim'),
('clay:read',             'ombor', 'read',   'Kley balansini ko''rish'),
('production:start',      'ishlab_chiqarish', 'create', 'Sessiyani boshlash'),
('production:finish',     'ishlab_chiqarish', 'update', 'Sessiyani yakunlash'),
('production:clay_add',   'ishlab_chiqarish', 'update', 'Kley qo''shish'),
('production:read',       'ishlab_chiqarish', 'read',   'Sessiyalarni ko''rish'),
('production:cancel',     'ishlab_chiqarish', 'delete', 'Sessiyani bekor qilish'),
('parent_paper:create',   'parent_paper', 'create', 'Ona qoghoz yaratish'),
('parent_paper:read',     'parent_paper', 'read',   'Ona qoghoz ko''rish'),
('cutting:manage',        'kesish', 'create', 'Kesish sessiyasini boshqarish'),
('cutting:read',          'kesish', 'read',   'Kesish hisobotini ko''rish'),
('plot:manage',           'plot', 'create', 'PLOT boshqaruvi'),
('plot:read',             'plot', 'read',   'PLOT ko''rish'),
('analytics:cost',        'analytics', 'read', 'Tannarx hisoboti'),
('analytics:waste',       'analytics', 'read', 'Brak hisoboti'),
('analytics:dashboard',   'analytics', 'read', 'Dashboard'),
('cost_config:manage',    'analytics', 'create', 'Narx sozlamalari'),
('users:manage',          'users', 'create', 'Foydalanuvchi boshqaruvi'),
('audit:read',            'audit', 'read',   'Audit log ko''rish');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'super_admin';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
    'bobin:create', 'bobin:read', 'bobin:update',
    'clay:create', 'clay:read'
) WHERE r.name = 'omborchi';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
    'bobin:read', 'clay:read',
    'production:start', 'production:finish', 'production:clay_add', 'production:read',
    'parent_paper:create', 'parent_paper:read'
) WHERE r.name = 'mashina_operatori';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
    'parent_paper:read', 'cutting:manage', 'cutting:read',
    'plot:manage', 'plot:read'
) WHERE r.name = 'kesuvchi_ishchi';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
    'bobin:read', 'clay:read', 'production:read', 'parent_paper:read',
    'cutting:read', 'plot:read',
    'analytics:cost', 'analytics:waste', 'analytics:dashboard', 'cost_config:manage'
) WHERE r.name = 'direktor';
