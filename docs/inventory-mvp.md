# Inventory MVP

## Architecture

- `apps/web`: Next.js App Router, React, Tailwind CSS, TanStack Query, Zustand,
  React Hook Form และ Zod
- `apps/api`: Fastify, JWT ใน httpOnly cookie, Zod และ Google Sheets API
- Backend flow: Route → `InventoryService` → `InventoryRepository` →
  `GoogleSheetsInventoryRepository`
- `Stock_Movements` เป็น source of truth และ `Stock_Balances` เป็น projection
- master data ถูก cache ใน memory 45 วินาทีและ invalidate หลังเขียน

Google Sheets เป็น adapter ปัจจุบันเท่านั้น จึงสามารถสร้าง PostgreSQL implementation ของ
`InventoryRepository` ภายหลังโดยไม่เปลี่ยน route หรือ business service

## Google Sheets tabs

ระบบตรวจ schema ของ 12 tabs ต่อไปนี้: `Users`, `Branches`, `Categories`, `Items`,
`Store_Items`, `Locations`, `Stock_Balances`, `Stock_Movements`, `Stock_Requests`,
`Stock_Request_Items`, `Stock_Counts` และ `Stock_Count_Items`

หัวตารางใช้ชื่อเดิมแบบ `Item_ID`; mapper ใน API แปลงเป็น camelCase model
checkbox `TRUE/FALSE` และตัวเลขถูก parse ก่อนใช้งาน

## Environment variables

Backend (`apps/api/.env`):

```dotenv
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
JWT_SECRET=
COOKIE_NAME=restaurant_session
NODE_ENV=development
```

สำหรับ local development สามารถใช้
`GOOGLE_SERVICE_ACCOUNT_KEY_FILE=../../key.json` แทน email/private key ได้ ไฟล์ key
ต้องอยู่นอก public directoryและถูก `.gitignore` เสมอ

Frontend (`apps/web/.env.local`, ไม่จำเป็นเมื่อใช้ proxy):

```dotenv
NEXT_PUBLIC_API_BASE_URL=
```

เมื่อไม่กำหนด Frontend จะใช้ same-origin `/api/v1` และ Next.js proxy ไปพอร์ต 4000

## Service Account

1. เปิด Google Sheets API ใน Google Cloud project
2. สร้าง Service Account และ key
3. แชร์ Spreadsheet ให้ `client_email` ของ Service Account เป็น **Editor** เพราะระบบต้อง
   append และ batch update ข้อมูล
4. ใส่ Spreadsheet ID และ credentials ใน `apps/api/.env`
5. ห้าม commit `.env` หรือ JSON key
6. ตรวจ schema แบบ read-only ด้วย `pnpm sheets:check`
7. ตรวจ request tabs, references และไฟล์รูป local แบบ read-only ด้วย `pnpm sheets:check-requests`

## รูปสินค้า

ไฟล์ local ต้องอยู่ใต้ `apps/web/public/images/items/` และชื่อไฟล์ต้องตรงกับ path
รวมถึงตัวพิมพ์เล็ก/ใหญ่บน Linux ตัวอย่าง:

- ไฟล์: `apps/web/public/images/items/red-pork.webp`
- ค่าใน Google Sheets: `Image_URL = /images/items/red-pork.webp`

รองรับ `.webp`, `.png`, `.jpg`, `.jpeg` และ URL ภายนอกแบบ HTTPS เมื่อโหลดไม่ได้
หน้าเว็บจะแสดง placeholder เดิมโดยไม่ทำให้ layout เปลี่ยน

## Codespaces

1. รัน `pnpm dev`
2. เปิด port 3000 และ 4000 โดยเลือก visibility ให้เหมาะกับข้อมูล
3. วิธีแนะนำคือเปิดหน้าเว็บผ่าน URL port 3000 และใช้ same-origin proxy ที่ตั้งไว้แล้ว
4. ถ้าแยก origin ให้ใส่ URL port 4000 ใน `NEXT_PUBLIC_API_BASE_URL`, ใส่ URL port
   3000 ใน `FRONTEND_ORIGIN` (รองรับ comma-separated origins) แล้ว restart dev server

## Demo flow

1. Login ด้วย user active ในแท็บ `Users` ซึ่งมี role `owner`, `manager`, `stock` หรือ `staff`
2. Owner/manager สร้าง Items และ Locations
3. เปิดหน้าไอเทมสาขา เลือกสินค้า ตั้ง Min/Target/default location แล้ว Save Changes
4. Stock รับสินค้าเข้าคลังที่หน้าเคลื่อนไหว (`RECEIVE`)
5. Staff เลือกห้องสินค้า ใส่ของในกระเป๋า และส่ง request
6. Stock/manager เปิดห้องคลัง อนุมัติและจ่ายเต็มหรือบางส่วน
7. การจ่ายสร้าง `TRANSFER` movement และอัปเดต balance ต้นทาง/ปลายทาง
8. ทำ stock count; เมื่อ complete ระบบสร้าง `ADJUSTMENT` สำหรับ variance

## Role access

- `owner`: ทุกหน้า รวม rebuild balance
- `manager`: master data และงาน inventory ทั้งหมด ยกเว้น rebuild
- `stock`: request, issue, movement, count และ balance
- `staff`: เลือกสินค้า สร้างคำขอ ดู/ยกเลิกคำขอของตนเอง

API ตรวจ role และ branch ซ้ำทุกครั้ง การซ่อนเมนูไม่ใช่ security boundary

## ข้อจำกัดของ MVP

- Google Sheets ไม่มี transaction; service ลดความเสี่ยงด้วย bulk read, batch update,
  duplicate Movement ID check และปิด submit ระหว่าง mutation แต่ยังไม่เทียบเท่าฐานข้อมูล
- legacy plain-text password ยังรองรับอยู่ ควร migrate เป็น Argon2id ทั้งหมด
- การแก้พร้อมกันหลายคนอาจเกิด lost update ได้
- รูปสินค้ารองรับ URL/path และ fallback แต่ยังไม่มี upload
- App process restart จะล้าง memory cache

## ย้ายไป PostgreSQL

สร้าง `PostgresInventoryRepository` ที่ implement `InventoryRepository`, ใช้ database
transaction ครอบ movement + balance projection, เพิ่ม unique constraint ให้ IDs และ
idempotency key จากนั้นเปลี่ยน dependency injection ใน `server.ts`; routes/services และ
Frontend API contract ไม่ต้องเปลี่ยน
