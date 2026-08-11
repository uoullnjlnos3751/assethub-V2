# Deploy ITAM On Docker

## 1. เตรียมค่าจากระบบเดิม

คัดลอกค่าจากเครื่อง `itsm` เดิมมาใส่ใน `backend/.env` ของเครื่องใหม่ให้ครบ โดยเฉพาะ:

- `JWT_SECRET`
- `LDAP_HOST`
- `LDAP_PORT`
- `LDAP_BASE_DN`
- `LDAP_DOMAIN`
- `LDAP_SEARCH_USER`
- `LDAP_SEARCH_PASSWORD`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

ตัวอย่างค่าฝั่งโดเมนใหม่:

```env
PORT=4000
NODE_ENV=production
FRONTEND_URL=http://itam.trrgroup.com:5173
CORS_ORIGIN=http://itam.trrgroup.com:5173,http://itam.trrgroup.com,http://itsm.trrgroup.com:5173,http://itsm.trrgroup.com
JWT_SECRET=copy-from-old-working-server
```

หมายเหตุ:

- `SMTP_FROM` ต้องไม่มีรูปแบบที่ Docker parse ไม่ได้
- ใช้รูปแบบนี้:

```env
SMTP_FROM=AssetITSM TRRT <automail.trrt@trrgroup.com>
```

## 2. เตรียมไฟล์ตัวแปรสำหรับ Docker Compose

คัดลอก `.env.docker.prod.example` เป็น `.env.docker.prod`

```bash
copy .env.docker.prod.example .env.docker.prod
```

แล้วแก้ค่าให้ตรงกับเครื่องจริง:

```env
POSTGRES_PASSWORD=strong-db-password
BACKEND_PORT=4000
FRONTEND_PORT=5173
FRONTEND_URL=http://itam.trrgroup.com:5173
CORS_ORIGIN=http://itam.trrgroup.com:5173,http://itam.trrgroup.com,http://itsm.trrgroup.com:5173,http://itsm.trrgroup.com
```

## 3. Build และ Start

```bash
docker compose --env-file .env.docker.prod -f docker-compose.prod.yml up -d --build
```

## 4. เช็กสถานะ

```bash
docker compose --env-file .env.docker.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.docker.prod -f docker-compose.prod.yml logs backend --tail 200
docker compose --env-file .env.docker.prod -f docker-compose.prod.yml logs frontend --tail 100
```

## 5. ทดสอบหลัง deploy

เปิด:

- `http://itam.trrgroup.com:5173/api/health`
- `http://itam.trrgroup.com:5173/api/auth/settings`
- `http://itam.trrgroup.com:5173/`

ผลที่ควรได้:

- `/api/health` ตอบ `200`
- `/api/auth/settings` ตอบ `200`
- หน้า login เปิดได้
- ถ้ารหัสผิดต้องได้ `401`

## 6. ถ้ายัง login ไม่ได้

ดู log backend และเช็กค่าเหล่านี้ก่อน:

- `JWT_SECRET` ต้องเป็นค่าจริงจากเครื่องเดิม หรือเป็นค่ายาวมากกว่า 32 ตัวอักษร
- `LDAP_*` ต้องครบและใช้ได้จริง
- `FRONTEND_URL` และ `CORS_ORIGIN` ต้องตรงกับโดเมนใหม่
