# Power BI — saytda ko‘rish

## 1. Power BI Service ga publish

1. Power BI Desktop → hisobot (Page 1–5) → **Publish** → workspace tanlang.
2. [app.powerbi.com](https://app.powerbi.com) da hisobotni oching.
3. **File** → **Embed report** → **Publish to web** → **Create** (ochiq havola).
4. **iframe** kodidan `src="..."` ichidagi URL ni nusxalang.

## 2. CRM ga ulash

1. Render API da: `ALLOW_POWERBI_PUBLIC_EMBED=true` (render.yaml da yoqilgan).
2. Kod deploy qiling.
3. CRM → **Analitika** → **Power BI hisobot** tab.
4. Admin (Sozlamalar huquqi): embed URL ni qo‘ying → **Saqlash**.
5. Hisobot saytda iframe ichida ko‘rinadi (faqat login qilganlar).

## 3. Eslatma

- **Publish to web** — internetda ochiq; havolani bilgan har kim ko‘ra oladi (CRM login dan tashqari ham).
- CRM ichida iframe faqat `analytics:dashboard` huquqi bilan ochiladi.
- CRM **Grafiklar** tab — alohida, serverdan.

## Migratsiya

```bash
cd backend && npm run migrate
```
