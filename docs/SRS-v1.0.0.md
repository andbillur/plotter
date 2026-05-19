# PLOTTER QOGʻOZ FABRIKASI — CRM TIZIMI

**Versiya:** 1.0.0 | **Sana:** 2026-05-19  
**Texnologiyalar:** PostgreSQL 16, Node.js 20 (Express), Redis, JWT Auth

To'liq texnik topshiriq — jadval sxemasi, API endpointlar, RBAC, formulalar va seed SQL.

Asosiy modullar:
- Ombor (bobin, kley)
- Ishlab chiqarish sessiyasi (START → kley → FINISH + tannarx)
- Ona qoghoz (split / inheritance)
- Kesish + PLOT
- Analitika (direktor)

Batafsil SQL va endpointlar ushbu hujjatning asl nusxasida (foydalanuvchi taqdim etgan prompt) saqlanadi; migratsiya: `backend/migrations/001_initial_schema.sql`.
