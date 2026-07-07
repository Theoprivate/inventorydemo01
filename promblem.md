# Codespaces web access problem

บันทึกเมื่อ: 2026-07-07

## อาการ

ไม่สามารถเปิดเว็บผ่าน URL ต่อไปนี้ได้ และได้รับ `HTTP 404`:

`https://improved-lamp-4jwgx9pjp69fpx5-3000.app.github.dev/`

## ผลการตรวจสอบ

- Next.js web app ใช้พอร์ต `3000`
- API ใช้พอร์ต `4000`
- ภายใน Codespace หน้า `/` ตอบ `307` และ redirect ไป `/login`
- ภายใน Codespace หน้า `/login` ตอบ `200`
- ภายใน Codespace API ตอบ `200`
- Codespaces แสดงพอร์ต `3000` เป็น `public` และ URL ตรงกับ URL ข้างต้น
- เมื่อเรียก URL ภายนอก ได้ `HTTP 404` จาก Codespaces tunnel (`x-served-by: tunnels-...`)

ผลข้างต้นยืนยันว่าแอปทำงานภายใน Codespace แต่ tunnel ภายนอกยังเชื่อมต่อกับ listener พอร์ต `3000` ไม่สำเร็จ

## สิ่งที่ดำเนินการแล้ว

1. ตรวจ route หลักของเว็บ พบว่า `/` redirect ไป `/login` ตามปกติ
2. สั่ง `pnpm dev` เพื่อเริ่ม web และ API
3. ยืนยันสถานะ HTTP ของ web และ API ผ่าน localhost
4. ตรวจสถานะ Codespaces port forwarding ผ่าน GitHub CLI
5. สลับ visibility ของพอร์ต `3000` จาก `private` กลับเป็น `public` เพื่อรีเฟรช tunnel
6. ทดสอบ URL ภายนอกอีกครั้ง แต่ยังได้รับ `404`

ไม่มีการแก้ business logic หรือ source code ของแอป

## ขั้นตอนถัดไป

1. ตรวจ process ที่ครองพอร์ต `3000` และ address ที่ process bind อยู่
2. หยุดเฉพาะ web process เดิมหากเป็น process ค้าง
3. สตาร์ต web server ใหม่โดย bind ที่ `0.0.0.0:3000`
4. ตรวจ localhost และ URL ภายนอกอีกครั้ง
5. หากยัง `404` ให้ rebuild/restart Codespace เพื่อสร้าง port-forwarding tunnel ใหม่
