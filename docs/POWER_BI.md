# Analitika — sir saqlanadi

## Asosiy qoida

- **CRM grafiklar** (`/dashboard/analytics`) — faqat login qilgan foydalanuvchi ko‘radi.
- **Publish to web** va ochiq Power BI iframe — **o‘chirilgan** (tannarx, oyliklar sir bo‘lishi uchun).
- **Power BI Desktop** — faqat ofis kompyuterida, PostgreSQL ulanish; internetga publish qilmang.

## CRM grafiklar

Analitika → **Grafiklar (himoyalangan)**. API `analytics:dashboard` huquqi talab qiladi.

## Power BI Desktop (mahalliy)

1. Desktop o‘rnating (bepul).
2. Analitika → **Power BI Desktop** — server va view nomlari.
3. Get Data → PostgreSQL → `v_bi_*` view’lar.
4. **File → Publish to web** ishlatmang.

## Migratsiya

```bash
cd backend && npm run migrate
```

`011_powerbi_private_only.sql` — saqlangan ochiq embed havolalar tozalanadi.

## Ochiq embedni yoqish (tavsiya etilmaydi)

Faqat maxsus holatda serverda:

```
ALLOW_POWERBI_PUBLIC_EMBED=true
```

Hozir `render.yaml` da `false`.
