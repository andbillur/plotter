-- Bobin/kley qo'shish faqat super_admin (omborchi dan olib tashlash)

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id AND rp.permission_id = p.id
  AND r.name = 'omborchi'
  AND p.code IN ('bobin:create', 'clay:create');
