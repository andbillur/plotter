# Plotter CRM — Frontend Development Prompt

Quyidagi promptni Cursor, ChatGPT yoki boshqa AI ga berishingiz mumkin. Dizayn fayllarini (Figma, PNG) alohida biriktiring.

---

## PROMPT (nusxalash uchun)

Sen tajribali frontend dasturchisan. **Plotter Qog'oz Fabrikasi CRM** uchun to'liq web frontend qurishing kerak.

### Loyiha haqida

O'zbekistondagi qog'oz plotter fabrikasi ishlab chiqarish jarayonini boshqaradi:
**Bobin/kley ombori → Ishlab chiqarish (START/FINISH) → Ona qoghoz bo'lish → Kesish → PLOT partiya → Tannarx va brak analitika.**

Backend allaqachon tayyor (Node.js 20 + Express + PostgreSQL). Frontend mavjud qobiq ustida quriladi.

### Texnologiyalar (majburiy)

- **React 19** + **TypeScript** + **Vite 6**
- **React Router v7** — marshrutlash
- Mavjud `frontend/src/api/client.ts` va `frontend/src/context/AuthContext.tsx` dan foydalan — qayta yozma
- Styling: **[DIZAYN: Figma/ranglar shu yerga]**
- QR skaner: `html5-qrcode` yoki `@zxing/browser` (planshet/telefon kamerasi)
- Deploy: **Render.com** static site (`VITE_API_URL` env)

### Muhit o'zgaruvchilari

```
VITE_API_URL=https://plotter-crm-api.onrender.com   # production
# local: http://localhost:3000
```

### Autentifikatsiya

```
POST /api/auth/login       { username, password } → { accessToken, refreshToken, user }
POST /api/auth/refresh     { refreshToken } → { accessToken, user }
POST /api/auth/logout      { refreshToken }
GET  /api/auth/me          → user + permissions[] (Bearer token)
```

- Token `localStorage`: `plotter_access_token`, `plotter_refresh_token`
- Har so'rovda: `Authorization: Bearer <accessToken>`
- 401 → login sahifasiga yo'naltirish
- Default test: `admin` / `admin123`

### Rollar va UI ko'rinishi

Har rol faqat o'z ruxsatlariga mos menyu va sahifalarni ko'radi (`permissions` yoki `role` bo'yicha):

| Rol | Asosiy vazifalar |
|-----|------------------|
| `super_admin` | Hamma modul + foydalanuvchilar |
| `omborchi` | Bobin kirim, kley kirim, ombor ko'rinishi |
| `mashina_operatori` | Ishlab chiqarish START/FINISH, kley qo'shish, ona qoghoz split |
| `kesuvchi_ishchi` | Kesish sessiyasi, mahsulot kiritish, PLOT |
| `direktor` | Dashboard, tannarx, brak, ombor holati (faqat o'qish) |

### API endpointlar (barchasi `/api` prefiksi)

**Foydalanuvchilar** (super_admin):
- `GET/POST /users`, `GET/PATCH/DELETE /users/:id`, `PATCH /users/:id/password`, `GET /users/roles`

**Mashinalar:**
- `GET /machines`, `POST /machines`, `GET /machines/:id/status`

**Bobin (ombor):**
- `GET /bobins?status&grammaj&page&limit`, `POST /bobins`, `GET /bobins/:id`
- `GET /bobins/qr/:qrCode`, `PATCH /bobins/:id`, `GET /bobins/stock/summary`

**Kley:**
- `GET /clay/balance`, `POST /clay/receive`, `GET /clay/transactions`

**Ishlab chiqarish:**
- `POST /production/sessions/start` — `{ bobinQrCode, machineId }`
- `POST /production/sessions/:id/clay/add` — `{ quantityKg?, bags? }`
- `POST /production/sessions/:id/finish` — `{ outputWeightKg, bobinRemainingWeightKg }`
- `GET /production/sessions`, `GET /production/sessions/active`, `GET /production/sessions/:id`
- `GET /production/sessions/:id/cost`, `PATCH /production/sessions/:id/cancel`

**Ona qoghoz:**
- `POST /parent-papers/split` — `{ sessionId, children: [{ weightKg, qrCode? }] }`
- `GET /parent-papers`, `GET /parent-papers/:id`, `GET /parent-papers/qr/:qrCode`
- `GET /parent-papers/:id/lineage`

**Kesish:**
- `POST /cutting/sessions/start` — `{ parentPaperQrCode, machineId?, inputWeightKg }`
- `POST /cutting/sessions/:id/products/add` — `{ widthCm, weightKg, lengthM? }`
- `DELETE /cutting/sessions/:id/products/:productId`
- `POST /cutting/sessions/:id/finish`
- `GET /cutting/sessions`, `GET /cutting/sessions/:id`, `GET /cutting/sessions/:id/waste-report`

**PLOT:**
- `GET /plots`, `GET /plots/active`, `POST /plots` — `{ widthCm }`
- `POST /plots/:id/items/add` — `{ cutProductId }`
- `DELETE /plots/:id/items/:cutProductId`, `POST /plots/:id/close`
- `GET /plots/:id`, `GET /plots/:id/summary`

**Analitika (direktor / super_admin):**
- `GET /analytics/dashboard`
- `GET /analytics/production?from&to&machineId`
- `GET /analytics/cost-report?sessionId | from&to`
- `GET /analytics/waste-report?from&to`
- `GET /analytics/clay-consumption`
- `GET /analytics/inventory`
- `GET /analytics/cost-config/current`, `POST /analytics/cost-config`

**QR universal:**
- `GET /api/qr/scan/:qrCode` → `{ type: "bobin"|"parent_paper"|"cut_product", id, data, allowedActions[] }`

### Sahifalar (minimal ro'yxat)

1. **Login** — username/parol, xato xabarlari o'zbekcha
2. **Layout** — sidebar yoki bottom nav (mobil), rol bo'yicha menyu, chiqish
3. **Dashboard** (direktor/admin) — bugungi sessiyalar, kley qoldig'i, PLOTlar
4. **Ombor — Bobinlar** — ro'yxat, filter, yangi bobin formasi, QR yaratish/ko'rsatish
5. **Ombor — Kley** — balans, kirim formasi, tarix
6. **Ishlab chiqarish** — aktiv sessiya kartasi, START (QR + mashina), kley qo'shish (+20kg tugmalar), FINISH formasi, tannarx natijasi
7. **Ona qoghoz split** — sessiya tanlash, bolalar og'irligi (jami = output), QR chop etish
8. **Kesish** — START (ona qoghoz QR), mahsulotlar ro'yxati, og'irlik/eni kiritish, brak % ko'rsatish
9. **PLOT** — ochiq PLOT, skaner orqali o'ram qo'shish, yopish
10. **Hisobotlar** — tannarx jadvali, brak, kley sarfi
11. **Foydalanuvchilar** (admin) — CRUD
12. **QR skaner modal** — kamera, natijaga qarab action tugmalari (`allowedActions`)

### Biznes oqimlar (UI ketma-ketligi)

**Operator:**
1. Bobin QR skan → mashina tanlash → START
2. Kley qo'shish (20 kg tugmasi yoki manual)
3. FINISH: qolgan bobin kg + tayyor mahsulot kg → tannarx ko'rsatish
4. Split: 3 ta (yoki ko'p) ona qoghoz og'irligi

**Kesuvchi:**
1. Ona qoghoz QR → kirish og'irligi → kesish boshlash
2. Har o'ram: eni (sm), og'irlik (kg)
3. PLOT ga qo'shish (ochiq PLOT yoki yangi ochish)

**Omborchi:**
1. Yangi bobin qabul (grammaj, og'irlik, uzunlik)
2. Kley kirim (qop soni yoki kg)

### Dizayn talablari

**[BU YERGA O'ZINGIZNING DIZAYNINGIZNI QO'YING]**

Masalan:
- Primary rang: `#1E40AF`
- Fon: `#F8FAFC`
- Font: Inter
- Komponent uslubi: rounded cards, shadow-sm
- Mobil-first (min 375px), planshet 768px+, desktop sidebar

Agar dizayn fayli bo'lmasa — sanoat/ishlab chiqarish CRM uslubida zamonaviy, toza UI yarating.

### UX qoidalari

- Barcha matnlar **o'zbek tilida** (lotin)
- Og'irlik maydonlari: `kg`, uzunlik: `m`, eni: `sm`
- Katta tugmalar (ishchi belangi/qo'lqop bilan ishlash uchun min 48px balandlik)
- Yuklanish: skeleton yoki spinner
- Xatolar: toast yoki alert, backend `error` maydoni
- Muvaffaqiyat: qisqa toast
- Raqamlar: `1 234,56` format (o'zbek)

### Kod tuzilmasi (kutilgan)

```
frontend/src/
  api/
    client.ts          # mavjud
    auth.ts, bobins.ts, production.ts, ...
  context/
    AuthContext.tsx    # mavjud
  components/
    Layout/, Sidebar/, QrScanner/, DataTable/, StatCard/, ...
  pages/
    LoginPage.tsx
    dashboard/
    ombor/
    production/
    cutting/
    plot/
    analytics/
    admin/
  hooks/
    useApi.ts, usePermissions.ts
  types/
    api.ts
```

### Qo'shimcha

- `usePermissions(code)` hook — tugmani yashirish/o'chirish
- Sahifalar lazy load (`React.lazy`)
- Build xatosiz: `npm run build`
- README ga qisqa frontend bo'limi qo'shish shart emas

### Mavjud kod

Loyiha: `c:\Users\User\crmPlotter\frontend\`
- Login va placeholder mavjud — ularni dizayn bilan almashtir
- `api/client.ts` kengaytir, modul bo'yicha ajrat

### Topshiriq

1. Dizaynni qo'llang (biriktirilgan Figma/PNG bo'yicha)
2. Yuqoridagi barcha sahifalarni API bilan ulang
3. Rol bo'yicha navigatsiya filtrlang
4. QR skaner integratsiya qiling
5. Render uchun build tayyor qiling

Boshlang: Layout + Login + rol bo'yicha Dashboard, keyin modullar ketma-ket.

---

## Dizayn biriktirish

Prompt oxiriga qo'shing:

```
Dizayn manbasi:
- Figma: [LINK]
- Yoki ilova: docs/designs/*.png
- Ranglar: primary #___ , secondary #___ , ...
```
