# Plotter CRM — Agent prompt

## Maqsad
Qog'oz plotter fabrikasi uchun CRM: bobin/kley ombori → ishlab chiqarish (START/FINISH) → ona qoghoz split → kesish → PLOT → tannarx/brak analitika.

## Stack
- PostgreSQL 16 (`backend/migrations/`)
- Node 20 + Express (`backend/src/`)
- Redis (cache)
- JWT + RBAC (`permissions.code`, `checkPermission()`)

## Rollar
`super_admin` | `omborchi` | `mashina_operatori` | `kesuvchi_ishchi` | `direktor`

## Asosiy biznes qoidalari
1. **Production FINISH**: `bobin_used`, `total_clay_used`, `output_weight_kg` → `calculate_production_cost(session_id)`
2. **Parent paper split**: `clay_share_i = (weight_i / sum(children)) * session.total_clay_used_kg`
3. **Cutting waste**: `waste = input - sum(cut_products)` (DB generated columns)
4. **Tranzaksiyalar**: start/finish/split — `BEGIN/COMMIT/ROLLBACK`
5. **QR**: `GET /api/qr/scan/:qrCode` — tip + `allowedActions` (rol bo'yicha)

## API prefiks
`/api/*` — to'liq ro'yxat foydalanuvchi SRS (QISM 3) da.

## Implementatsiya tartibi
1. ✅ Schema + migrations + RBAC seed
2. ✅ Auth (login, refresh, bcrypt, super_admin seed)
3. ✅ Ombor: bobins, clay
4. ✅ Production sessions (start/clay/finish + cost report)
5. ✅ Parent paper split + lineage
6. ✅ Cutting + plot
7. ✅ Analytics + QR universal scan

## Konvensiyalar
- Modul struktura: `src/modules/<name>/{*.routes.js,*.controller.js,*.service.js}`
- Xatoliklar o'zbekcha: `{ error: '...' }`
- Zod validatsiya `middleware/validate.js`
