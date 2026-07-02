# Inventory Demo 01

ระบบ Restaurant ERP ตัวอย่าง ประกอบด้วย Next.js frontend และ Fastify API

## เริ่มใช้งาน

```bash
npm install
npm --prefix apps/web install
npm --prefix apps/api install
cp apps/api/.env.example apps/api/.env # ทำเฉพาะครั้งแรกที่ยังไม่มี .env
npm run dev
```

เปิด http://localhost:3000 ระบบจะพาไปหน้า `/login`

บัญชี development เริ่มต้น:

- Username: `admin`
- Password: `admin123`

ค่าบัญชีและ session อยู่ใน `apps/api/.env` ซึ่งไม่ถูก commit ขึ้น Git ดูรูปแบบได้จาก `apps/api/.env.example`

## ใช้ Google Sheets

1. เปลี่ยน `AUTH_MODE=sheets` ใน `apps/api/.env`
2. ตั้ง `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` และ `GOOGLE_PRIVATE_KEY`
3. แชร์ Spreadsheet ให้ service account มีสิทธิ์อ่าน
4. สร้างชีตชื่อ `Users` โดยแถวแรกเป็นหัวตาราง และคอลัมน์ A-F เป็น:

```text
userId | username | password | displayName | role | isActive
```

ค่า `isActive` ต้องเป็น `TRUE` จึงจะเข้าสู่ระบบได้

> โหมด Sheets ปัจจุบันเป็น MVP และเก็บรหัสผ่านแบบข้อความธรรมดา ไม่ควรใช้กับ production ก่อนเปลี่ยนเป็น password hashing และฐานข้อมูลที่เหมาะสม

## URL หลัก

- Frontend: http://localhost:3000
- Login: http://localhost:3000/login
- Dashboard: http://localhost:3000/dashboard
- API health: http://localhost:4000/health

## ตรวจสอบก่อน deploy

```bash
npm test
npm run build
```
