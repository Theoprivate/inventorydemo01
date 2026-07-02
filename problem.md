# บันทึกปัญหาและการแก้ไข

อัปเดตล่าสุด: 2026-07-02

## 1. ไฟล์ `next-env.d.ts` เปลี่ยนเอง

- อาการ: `apps/web/next-env.d.ts` เปลี่ยน path ระหว่าง `.next/types/routes.d.ts` และ
  `.next/dev/types/routes.d.ts` หลังสลับระหว่าง `next build` กับ `next dev`
- สาเหตุ: Next.js สร้างไฟล์นี้อัตโนมัติตามโหมดที่กำลังรัน
- ผลกระทบ: Git แสดงไฟล์แก้ไขทั้งที่ไม่ได้แก้ business logic
- สถานะ: ยังเป็นพฤติกรรมที่เกิดซ้ำได้ ไม่ควรแก้ไฟล์นี้ด้วยมือ

## 2. ยังไม่ได้ตั้งค่า Google Sheets authentication

- อาการ: ตอนแรกไม่มี `apps/api/.env` และระบบใช้ local authentication
- สาเหตุ: ยังไม่มี Spreadsheet ID และ Service Account credentials ใน runtime config
- การแก้ไข: สร้าง `apps/api/.env`, ตั้ง `AUTH_MODE=sheets`, Spreadsheet ID และ path
  ของ Service Account key
- สถานะ: แก้แล้ว และไฟล์ `.env` ถูก ignore ไม่ให้เข้า Git

## 3. `key.json` มีความเสี่ยงถูก commit

- อาการ: Git แสดง `key.json` เป็น untracked file
- ความเสี่ยง: private key ของ Google Service Account อาจหลุดขึ้น repository
- การแก้ไข: เพิ่ม `key.json` และ `**/key.json` ใน `.gitignore`
- การแก้ไขเพิ่มเติม: API อ่าน credentials จาก path ใน
  `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` โดยตรง จึงไม่ต้องคัดลอก private key ลง `.env`
- สถานะ: แก้แล้ว ห้าม force-add ไฟล์นี้เข้า Git

## 4. Login ตอบ `401 Unauthorized`

- ความหมาย: API ติดต่อ Google Sheet ได้ แต่ไม่พบแถวที่ `username`, `password` และ
  `isActive` ตรงตามเงื่อนไขพร้อมกัน
- ตรวจพบ: มีแท็บ `Users`, header A-F ถูกต้อง และบัญชี `admin` มี password กับ
  `isActive=TRUE` ครบ
- การตรวจสอบ: เรียก API โดยตรงด้วยบัญชีในชีตแล้วได้ HTTP 200
- สาเหตุที่เป็นไปได้ตอนเกิดเหตุ: กรอกข้อมูลไม่ตรง, มีช่องว่างใน password,
  หน้าเว็บ/process ยังใช้ค่าก่อนหน้า หรือ browser โหลด JavaScript เก่าจาก cache
- สถานะ: API และข้อมูลในชีตทำงานแล้ว

## 5. หน้า Login แสดง `Failed to fetch`

- อาการ: หน้าเว็บเปิดผ่าน Codespaces URL แต่ส่ง request ไปที่
  `http://localhost:4000`
- สาเหตุ: `localhost` ใน browser หมายถึงเครื่องของผู้ใช้ ไม่ใช่ API ภายใน
  Codespaces และยังเป็นคนละ origin กับหน้าเว็บ
- การแก้ไข: เปลี่ยน frontend ให้เรียก same-origin path `/api` และเพิ่ม Next.js
  rewrite จาก `/api/:path*` ไป `http://127.0.0.1:4000/:path*`
- การตรวจสอบ: Login ผ่าน proxy ได้ HTTP 200 และ `/api/auth/me` พร้อม session cookie
  ได้ HTTP 200
- สถานะ: แก้แล้วใน commit `b5b3f04`

## 6. พอร์ตและ process ชนกัน

- อาการแรก: API start ไม่ได้และขึ้น `listen EPERM` ใน sandbox
- การแก้ไข: รัน server ด้วยสิทธิ์ที่อนุญาตให้ bind port
- อาการถัดมา: ขึ้น `EADDRINUSE` ที่พอร์ต 4000
- สาเหตุ: มี API process เดิมรันอยู่แล้ว
- ผลกระทบ: การ start process ใหม่ล้มเหลว แต่ API เดิมยังตอบ request ได้
- ข้อควรทำ: ตรวจ process ที่พอร์ต 3000/4000 ก่อน start และ restart process เดิมเมื่อ
  environment/config เปลี่ยน

## 7. เปิด browser อัตโนมัติไม่ได้

- อาการ: `code --open-url` ใช้ไม่ได้เพราะไม่มีคำสั่ง `code`; `xdg-open` ไม่คืนผลตามปกติ
- การแก้ไข: ใช้ Codespaces forwarded URL ของพอร์ต 3000 โดยตรง
- สถานะ: หน้า `/login` ผ่าน forwarded URL ตอบ HTTP 200

## 8. Git commit ถูก sandbox ปฏิเสธ

- อาการ: `Unable to create .git/index.lock: Read-only file system`
- สาเหตุ: `.git` เขียนไม่ได้ภายใต้สิทธิ์ sandbox ปกติ
- การแก้ไข: ขอสิทธิ์สำหรับ `git add` และ `git commit`
- สถานะ: commits ถูกสร้างสำเร็จ แต่ local branch ยังไม่ได้ push ขึ้น remote

## 9. Google Sheet ส่งแถวว่างจำนวนมาก

- อาการ: API อ่านช่วง `Users!A:F` แล้วได้ประมาณ 999 data rows เพราะแถวว่างมีค่า
  `FALSE` ในคอลัมน์ `isActive`
- ผลกระทบ: response จาก Sheets ใหญ่เกินจำเป็น แม้ API จะทิ้งแถวที่ไม่มี `userId`
- สถานะ: ไม่ทำให้ Login ผิดพลาด แต่ควรลบสูตร/ค่าในแถวว่างหรือจำกัด range หากข้อมูลโตขึ้น

## 10. ข้อจำกัดด้านความปลอดภัยที่ยังค้าง

- password ใน Google Sheet ยังเก็บเป็นข้อความธรรมดา
- ยังไม่มีหน้าเพิ่ม/แก้ไข/ปิดบัญชีผู้ใช้ ผู้ดูแลต้องแก้แถวใน Sheet เอง
- `SESSION_SECRET` ปัจจุบันเป็นค่า development ต้องเปลี่ยนเป็นค่าลับแบบสุ่มก่อน deploy
- Google Sheet เหมาะกับ demo หรือระบบภายในขนาดเล็ก ไม่เหมาะเป็น credential store สำหรับ
  production จนกว่าจะใช้ password hashing และ data store ที่เหมาะสม
- Service Account ใช้ scope แบบ read-only ดังนั้นแอปอ่านผู้ใช้ได้แต่เขียน/ลงทะเบียนผู้ใช้ไม่ได้

## สถานะการตรวจสอบล่าสุด

- Service Account อ่าน Spreadsheet ได้
- Login ด้วยบัญชี active ใน Sheet ได้ HTTP 200
- Session endpoint ได้ HTTP 200 ผ่าน Next.js proxy
- API tests ผ่าน
- Next.js production build ผ่าน
- `key.json` และ `apps/api/.env` ไม่ถูก track ใน Git
- local branch มี commits ที่ยังไม่ได้ push ขึ้น `origin/main`
