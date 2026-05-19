# Plotter Qog'oz Fabrikasi — CRM

PostgreSQL 16 + Node.js 20 (Express) + Redis + JWT/RBAC.

## Tez start

```powershell
docker compose up -d
cd backend
Copy-Item .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

**Login:** `admin` / `admin123`

## API modullar

| Prefiks | Modul |
|---------|--------|
| `/api/auth` | Login, refresh, logout, me |
| `/api/users` | Foydalanuvchilar (super_admin) |
| `/api/machines` | Mashinalar |
| `/api/bobins` | Bobin ombori |
| `/api/clay` | Kley ombori |
| `/api/production` | Ishlab chiqarish sessiyalari |
| `/api/parent-papers` | Ona qoghoz split |
| `/api/cutting` | Kesish |
| `/api/plots` | PLOT partiyalar |
| `/api/analytics` | Hisobotlar, tannarx |
| `/api/qr/scan/:qrCode` | Universal QR |

## Biznes oqim

1. Omborchi: bobin/kley kirim
2. Operator: `POST /api/production/sessions/start` → kley qo'shish → `finish` (tannarx avto)
3. Operator: `POST /api/parent-papers/split`
4. Kesuvchi: kesish sessiyasi → mahsulotlar → PLOT
5. Direktor: `/api/analytics/*`

To'liq SRS: `docs/SRS-v1.0.0.md`

## Frontend (Next.js)

`frontend/` — Downloads dagi dizayn, API bilan ulangan.

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

`.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3000/api`

## Render.com deploy

1. Repo ni GitHub ga push qiling
2. Render → **New Blueprint** → `render.yaml` tanlang
3. **PostgreSQL** avtomatik ulanadi (`DATABASE_URL`)
4. API servisda `CORS_ORIGIN` = frontend URL (masalan `https://plotter-crm-web.onrender.com`)
6. `npm run seed` — admin yaratish (backend birinchi marta ishga tushganda avtomatik ham ishlaydi)
5. Web servisda `NEXT_PUBLIC_API_URL` = API URL + `/api` (masalan `https://plotter-crm-api.onrender.com/api`)

| Servis | Papka | Build | Start |
|--------|-------|-------|-------|
| API | `backend/` | `npm install` | `npm start` (migrate + seed + server) |
| Web | `frontend/` | `npm install && npm run build` | `npm start` (Next.js) |

Redis ixtiyoriy — bo'lmasa cache o'chirilgan holda ishlaydi.
