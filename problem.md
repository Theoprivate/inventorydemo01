# บันทึกปัญหาและการแก้ไข

อัปเดตล่าสุด: 2026-07-03

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
- Service Account ใช้ scope แบบเขียนได้ (`https://www.googleapis.com/auth/spreadsheets`)
  แล้ว แต่ Spreadsheet ต้องแชร์สิทธิ์ Editor ให้ Service Account ด้วย

## 11. Turbo เตือนว่า test ไม่มี output ตามที่กำหนด

- อาการ: หลังรัน `pnpm test` มีคำเตือน
  `no output files found for task @inventory/web#test`
- สาเหตุ: ใน `turbo.json` กำหนด output ของ task `test` เป็น `coverage/**` แต่คำสั่ง
  Vitest ปัจจุบันไม่ได้เปิดการสร้าง coverage
- ผลกระทบ: tests ยังผ่านตามปกติ แต่ Turbo ไม่พบ artifact ที่ประกาศไว้และ cache ของ task
  อาจไม่ทำงานตามที่คาด
- แนวทางแก้: เลือกอย่างใดอย่างหนึ่งระหว่างเปิด coverage ในคำสั่ง test หรือเอา
  `outputs: ["coverage/**"]` ออกจาก task หากไม่ต้องการเก็บ coverage
- สถานะ: ยังไม่ได้แก้ เพื่อไม่เปลี่ยนพฤติกรรมของ test โดยไม่มีข้อกำหนดเพิ่มเติม

## 12. ผลตรวจ Item Configuration และ Inventory Market

### ไฟล์และโครงสร้างที่ใช้งานจริง

- Next.js app อยู่ที่ `apps/web`
- public directory อยู่ที่ `apps/web/public`
- รูปสินค้าแบบ local ต้องอยู่ที่ `apps/web/public/images/items/` และอ้างด้วย path เช่น
  `/images/items/red-pork.webp`
- หน้าเว็บที่พบ: `/settings/items`, `/settings/items/new`,
  `/settings/items/[itemId]/edit` และ `/inventory/request`
- route `/settings/items/new` และ `/settings/items/[itemId]/edit` รวมถึง component ใหม่ที่
  เกี่ยวข้องถูกรวมไว้ใน version control ของงานชุดนี้
- Frontend หลัก: `apps/web/app/(protected)/settings/items/`,
  `apps/web/components/item-config-form.tsx`, `apps/web/components/item-image.tsx`,
  `apps/web/app/(protected)/inventory/request/page.tsx`,
  `apps/web/components/inventory-market.tsx`,
  `apps/web/components/pixel-cart-button.tsx` และ `apps/web/stores/backpack.ts`
- Backend หลัก: `apps/api/src/app.ts`, `apps/api/src/services/inventory-service.ts`,
  `apps/api/src/repositories/google-sheets-inventory-repository.ts`,
  `apps/api/src/utils/mappers.ts` และ `apps/api/src/utils/sheets.ts`

### Endpoint ปัจจุบัน

- `GET /api/v1/items`: มี และใช้ได้กับผู้ใช้ที่ login ทุก role
- `GET /api/v1/items/:itemId`: ยังไม่มี
- `POST /api/v1/items`: มี เฉพาะ `owner` และ `manager`
- `PATCH /api/v1/items/:itemId`: มี เฉพาะ `owner` และ `manager`
- หน้า edit ใช้ `GET /items` แล้วค้นหา `itemId` ฝั่ง client จึงยังไม่จำเป็นต้องเพิ่ม route
  ใหม่เพื่อให้หน้าปัจจุบันทำงาน
- `staff` ใช้ Inventory Market และสร้าง Stock Request ได้ แต่ไม่มีสิทธิ์เพิ่มหรือแก้ Item

### สาเหตุของการ์ด `NO ID`

- `rowsToRecords()` เดิมรับทุกแถวที่มีค่าอย่างน้อยหนึ่ง cell
- checkbox ใน Google Sheets ทำให้แถวที่ดูว่างยังมี `Is_Active=FALSE`
- `mapItem()` จึงสร้าง Item ที่มี `itemId=""` และ UI เดิมแสดง fallback เป็น `NO ID`
- implementation ปัจจุบันกรองแถวที่ไม่มี `Item_ID` หรือ `Item_Name` ใน repository,
  service และ UI พร้อม tests แล้ว

### สาเหตุที่ `Image_URL` อาจแก้ไม่ได้

- เส้นทางข้อมูลในโค้ดมีครบ: form `imageUrl` → `PATCH` → `saveItem()` →
  `itemRecord().Image_URL` → Google Sheets `upsert()`
- API จะตอบ 403 หากใช้ role `staff` หรือ `stock`
- validation รับเฉพาะ local path ที่ขึ้นต้นด้วย `/` หรือ HTTPS URL และต้องลงท้ายด้วย
  `webp`, `png`, `jpg` หรือ `jpeg`
- การเขียนจริงจะล้มเหลวหาก Service Account ไม่ได้เป็น Editor ของ Spreadsheet
- process API ที่ยังรันโค้ดเก่าอาจทำให้ผลไม่ตรงกับ working tree
- tests ปัจจุบันตรวจ PATCH ผ่าน MemoryRepository แต่ยังไม่ใช่ integration test การเขียน
  Google Sheets จริง

### Component เดิม

- รูปสินค้าใช้ `ItemImage`; URL ถูก normalize ด้วย `image-url.ts` และ fallback เป็น
  placeholder เมื่อ URL ว่าง โหลดไม่ได้ หรือชนิดไฟล์ไม่รองรับ
- cart drawer อยู่ภายในหน้า `/inventory/request`
- floating button แยกเป็น `PixelCartButton`
- state ของรถเข็นเก็บด้วย Zustand ใน `stores/backpack.ts` และ persist ใน
  `sessionStorage`

### แผนแก้ตามลำดับ

1. คง Google Sheets schema, Stock Request business logic และ API routes เดิม
2. ยืนยันการกรองแถว Item ว่างใน repository/service โดยไม่กระทบรายการจริง
3. ทดสอบ `PATCH /items/:itemId` กับ Google Sheets จริงด้วยบัญชี `owner`/`manager`
4. ตรวจสิทธิ์ Editor, cache invalidation และ restart API process หลังเปลี่ยนโค้ด
5. ทดสอบ list/new/edit, รูปสินค้า, market และ cart ผ่าน browser
6. commit ไฟล์ route/component/test ใหม่ที่ยัง untracked
7. รัน `pnpm typecheck`, `pnpm lint`, `pnpm test` และ `pnpm build`

ผลตรวจ ณ ตอน audit: ทั้งสี่คำสั่งผ่าน, API 28 tests และ Web 11 tests ผ่านทั้งหมด โดย
`lint` ปัจจุบันเรียก `tsc --noEmit` ไม่ใช่ ESLint

## 13. Blank Item และการ์ด `NO ID`

- อาการ: หน้า Item Configuration แสดงการ์ดที่ไม่มีข้อมูลและใช้ข้อความ fallback
  `NO ID`; จำนวนการ์ดมากกว่าจำนวน Item จริงใน Google Sheets
- สาเหตุจริง: แถวที่ดูว่างใน Google Sheets ยังมีค่า `Is_Active=FALSE` จาก checkbox
  ทำให้ `rowsToRecords()` ถือว่าเป็นแถวข้อมูล จากนั้น mapper สร้าง Item ที่มี
  `itemId=""` และ UI เดิมนำไป render
- การแก้ไขฝั่ง backend:
  - Google Sheets repository กรอง record ที่ไม่มีทั้ง `Item_ID` และ `Item_Name`
    หลังแปลง row และก่อน cache/ส่งต่อ
  - Inventory service กรอง typed Item ซ้ำหลัง `mapItem()` เพื่อเป็น defensive boundary
  - ไม่สร้าง Item ID ทดแทนและไม่เปลี่ยน Google Sheets schema
- การแก้ไขฝั่ง frontend:
  - หน้า `/settings/items` และ `/inventory/request` กรอง Item ที่ไม่มี `itemId` หรือ
    `itemName` ซ้ำด้วย helper เดียวกัน
  - จำนวนใน category tab และจำนวนการ์ดคำนวณจาก Item ที่ valid เท่านั้น
  - production source ไม่มี fallback `NO ID` และไม่มีการสร้าง placeholder card เพื่อแทน
    row ว่าง
- Mapper ที่ยืนยันแล้ว: `Item_ID → itemId`, `Item_Name → itemName`,
  `Category_ID → categoryId`, `Image_URL → imageUrl` และ `Is_Active → isActive`
- Apps Script: ไม่พบไฟล์ `.gs`, `insertCheckboxes()` หรือ `requireCheckbox()` ใน
  repository นี้ จึงไม่ได้แก้ Data Validation ภายนอก workspace และไม่ได้ลบข้อมูลจริง
  ใน Google Sheets
- Tests ที่เพิ่ม: row ว่าง, row ที่มีเฉพาะ `Is_Active=FALSE`, มี ID แต่ไม่มีชื่อ,
  มีชื่อแต่ไม่มี ID, row ที่ถูกต้อง, repository filtering โดยตรง, จำนวน Item/card และ
  การยืนยันว่าไม่มี fallback `NO ID`
- ผลตรวจ: related backend 25 tests ผ่าน, API ทั้งหมด 33 tests ผ่าน, Web ทั้งหมด
  13 tests ผ่าน, typecheck ผ่าน และ `git diff --check` ผ่าน
- สถานะ: แก้แล้วและรวมไว้ใน version control ของงานชุดนี้

## 14. ช่อง MIN/TARGET ใน Inventory Market ซ้อนและถูกตัด

- อาการ: label `MIN`/`TARGET` อยู่ชิดค่าตัวเลข, ตัวเลขมีพื้นที่ไม่พอและอาจถูกตัด,
  บล็อกค่ามีความสูงน้อย และปุ่มใส่กระเป๋าอยู่ชิดบล็อกมากเกินไป
- สาเหตุ: `ItemMarketCard` เดิมแสดง label กับค่าภายใน `<span>` ขนาดเล็ก ใช้เพียง
  `py-2` และไม่มี `min-w-0`, `w-full` หรือความสูงขั้นต่ำสำหรับค่าตัวเลข
- การแก้ไข:
  - เปลี่ยนบล็อกเป็น grid 2 คอลัมน์ `gap-3` ซึ่งใช้กับทั้ง mobile และ desktop
  - แต่ละช่องใช้ flex แนวตั้ง, `min-w-0`, `gap-2`, border แบบ dashed และ `p-3`
  - แยก label กับค่าคนละบรรทัด และแสดงค่าด้วย read-only input สูง 40px
  - input ใช้ `w-full`, `min-w-0` และ `leading-normal` เพื่อป้องกันการตัด/overflow
  - เพิ่มระยะก่อนปุ่ม 16px และกำหนดปุ่มสูงอย่างน้อย 48px โดยคง pixel shadow เดิม
  - ไม่เปลี่ยน `onToggle`, cart state หรือ business logic
- Tests ที่แก้: component test ตรวจโครงสร้าง 2 คอลัมน์, field layout, ขนาด input,
  `leading-normal`, ค่า MIN/TARGET และขนาด/ระยะของปุ่ม
- ผลตรวจ: related tests 4 tests ผ่าน, Web typecheck ผ่าน และ `git diff --check` ผ่าน
- สถานะ: แก้แล้วและรวมไว้ใน version control ของงานชุดนี้

## 15. Floating Cart และ Cart Drawer เลื่อนไปกับหน้า

- อาการ:
  - ปุ่มรถเข็นไม่ติด viewport และอาจต้องเลื่อนลงจึงเห็น
  - เปิด drawer ขณะอยู่ท้ายหน้าแล้ว drawer อ้างอิงตำแหน่ง document/layout เดิม
  - drawer ไม่ครอบ viewport เต็มจอ และ header/footer เลื่อนไปพร้อมรายการ
- สาเหตุจริง: ปุ่มและ drawer เดิม render อยู่ภายใน `.market-workspace` ซึ่งมี animation
  ที่ใช้ `transform` พร้อม fill mode ทำให้เกิด containing block/stacking context ใหม่;
  `position: fixed` ภายในจึงไม่ได้อ้างอิง viewport ตามที่ต้องการ
- การแก้ไข:
  - render floating button และ drawer ผ่าน React portal ไปที่ `document.body`
  - floating button ใช้ `position: fixed`, mobile `right: 16px`, desktop
    `right/bottom: 28px`, รองรับ safe-area และอยู่เหนือ navigation/content
  - ซ่อน floating button เมื่อ drawer เปิด
  - drawer wrapper ใช้ `fixed inset-0`; overlay และ drawer ใช้ absolute ภายใน wrapper
    โดย drawer อยู่ `inset-y-0 right-0`, สูง `100dvh`, เต็มความกว้างบน mobile และ
    `max-width: 480px` บนจอใหญ่
  - drawer ใช้ flex column; header/footer เป็น `shrink-0` และเฉพาะ body ใช้
    `min-h-0 flex-1 overflow-y-auto`
  - lock `document.body` scroll ขณะเปิด และคืนค่า `overflow` เดิมเมื่อปิด โดยไม่ใช้
    `window.scrollTo` จึงไม่เปลี่ยนตำแหน่ง scroll ของผู้ใช้
  - คง bottom padding ของหน้าเพื่อหลบ floating button, bottom navigation และ safe-area
  - ไม่เปลี่ยน cart state, callback เพิ่ม/ลบสินค้า หรือ Stock Request business logic
- Tests ที่เพิ่ม/แก้:
  - ตรวจ fixed position, responsive offsets, safe-area, z-index และการซ่อนปุ่ม
  - ตรวจ viewport overlay, drawer position/height/width และ scrollable body
  - ตรวจ body scroll lock และการคืนค่า overflow เดิม
- ผลตรวจ: related tests 5 tests ผ่าน, Web typecheck ผ่าน, `git diff --check` ผ่าน
  และไม่พบการใช้ `window.scrollTo` ใน source
- ข้อจำกัดการตรวจ: workspace ไม่มี Playwright, Puppeteer หรือ browser runtime จึงยังไม่ได้
  ทำ screenshot/interaction test จริงที่ 375×667, 390×844, 768×1024 และ 1366×768;
  ตรวจ responsive behavior จาก class และ component tests โดยไม่ติดตั้ง dependency เพิ่ม
- สถานะ: แก้แล้วและรวมไว้ใน version control ของงานชุดนี้

## 16. Stock Movement ใช้ dropdown/table ทำงานยาก

- อาการ:
  - หน้า Stock Movement เดิมรวม movement type, สินค้า, location, จำนวน และหมายเหตุไว้ใน
    form เดียว และใช้ native dropdown ยาวสำหรับเลือกสินค้า
  - ผู้ใช้มองไม่เห็นรูปสินค้า หมวดหมู่ หรือยอดคงเหลือก่อนเลือก
  - Stock Count เดิมใช้ layout คล้ายตารางที่มี input ขนาดเล็กต่อแถว ใช้งานบน mobile ยาก
- สาเหตุ: UI เดิมออกแบบตามโครงสร้าง payload มากกว่าลำดับงานของพนักงาน และไม่ได้แยก
  “เลือกงาน → เลือกสินค้า → ตรวจและยืนยัน” ออกจากกัน
- การแก้ไข Stock Movement:
  - เปลี่ยนเป็น 3 steps: เลือกประเภทงานด้วยการ์ด, เลือกสินค้าจาก card grid และยืนยันใน
    action panel
  - เก็บ enum backend เดิม `RECEIVE`, `ISSUE`, `WASTE`, `ADJUSTMENT`, `TRANSFER` และ
    `RETURN`; ปุ่ม “นับสต๊อก” นำไป flow `/inventory/count` เดิม
  - ตัด native product dropdown ออก เพิ่ม search และ category filter แบบปุ่ม
  - product card ใช้ `itemId` จริง แสดงรูป ชื่อ หน่วย และยอดคงเหลือรวม
  - product grid ใช้ 2 columns บน mobile และ
    `repeat(auto-fit, minmax(180px, 1fr))` บนจอใหญ่
  - action panel กว้างสูงสุด 460px และมีปุ่ม `-10`, `-1`, `+1`, `+10`, number input,
    หน่วย, location, adjustment direction และหมายเหตุ
  - การกด type หรือสินค้าใช้ `type="button"`; มีเพียงปุ่มยืนยันใน STEP 3 ที่ submit
- การแก้ไข Stock Count:
  - เปลี่ยน location และ count round เป็นปุ่มการ์ด
  - แต่ละสินค้ามีรูป ยอดระบบ ผลต่าง quantity controls และหมายเหตุ โดยไม่มี table หรือ
    dropdown ต่อแถว
  - รองรับจำนวนจริงเป็น 0 และยังส่งหลายรายการด้วยปุ่ม “บันทึกทั้งหมด”
  - คง Draft/Completed flow และ confirmation ก่อน complete เหมือนเดิม
- สิ่งที่ไม่เปลี่ยน:
  - API routes `/stock-movements` และ `/stock-counts`
  - payload fields, Google Sheets schema และ Stock Movement/Stock Count business logic
  - การเลือกเฉพาะ Store Item ที่ active และตั้ง `Require_Daily_Count`
- Tests ที่เพิ่ม:
  - movement enum/type cards, product selection ด้วย Item ID จริง และ non-submit buttons
  - quantity adjustment พร้อมค่าต่ำสุดของ Movement และค่า 0 สำหรับ Stock Count
  - Stock Count card ไม่มี table/dropdown และ multi-item payload คงรูปแบบ API เดิม
- ผลตรวจ: focused tests ล่าสุด 8 tests ผ่าน, API ทั้งหมด 33 tests ผ่าน, Web ทั้งหมด
  23 tests ผ่าน, typecheck ผ่าน, lint ผ่าน, production build ผ่าน และ
  `git diff --check` ผ่าน
- หมายเหตุ: `pnpm lint` รอบแรกถูก terminate ด้วย exit 143 เพราะรันพร้อม build และแย่ง
  resource; เมื่อรันซ้ำเดี่ยว ๆ ผ่านทั้ง API และ Web จึงไม่ใช่ lint error
- สถานะ: แก้แล้วและรวมไว้ใน version control ของงานชุดนี้

## 17. UI แต่ละหน้าใช้ style คนละระบบและถูก global selector ครอบ

- อาการ:
  - หน้า `/inventory/request` มี visual style แบบ warm pixel-art แต่หน้าอื่นยังใช้
    border/shadow สีดำและ accent สีแดงแบบ legacy
  - `page-kit.tsx` เดิมมี shared component น้อย ทำให้แต่ละหน้าต้องเขียน `className`
    ยาวและกำหนดสี ขอบ เงา form และ card ซ้ำ
  - selector เช่น `.market-workspace article:not(.market-card)` และ selector ที่จับ
    `.overflow-x-auto`, table, `.border-dashed` และ fixed form ส่ง style ไปยัง element
    ที่ไม่เกี่ยวข้อง
- สาเหตุ:
  - presentation ถูกผูกกับ HTML element และ utility class ทั่วไป แทน component class
    ที่มี scope ชัดเจน
  - style ที่ reuse ได้อยู่ใน `inventory-market.tsx` ซึ่งเป็น component เฉพาะหน้า
  - ไม่มี semantic tokens กลางสำหรับ cream, brown, caramel, border และ pixel shadow
- การแก้ไข design system:
  - เพิ่ม semantic tokens และ scoped `game-*` classes ใน `globals.css`
  - เพิ่ม `GamePanel`, `GameCard`, `GameButton`, `GameButtonLink`, `StatusBadge`,
    `FilterBar`, `FormField`, `SelectableTile`, `DataTableShell`, `EmptyState` และ
    `ActionBar` ใน `page-kit.tsx`
  - ให้ shared style ใน `inventory-market.tsx` reuse primitives จาก `page-kit.tsx`
  - ลบ generic workspace selectors ที่ครอบ article, overflow container, tables,
    dashed border และ fixed form; table style ถูกจำกัดไว้ใต้ `.game-table-shell`
- หน้าที่ migrate แล้ว:
  - `/dashboard`
  - `/inventory/request`, `/inventory/requests`, `/inventory/stockroom`
  - `/inventory/movements`, `/inventory/count`, `/inventory/balances`
  - `/settings/items`, `/settings/items/new`, `/settings/items/[itemId]/edit`
  - `/settings/store-items`, `/settings/locations`
  - component ลูก `stock-movement-ui.tsx`, `stock-count-card.tsx` และ
    `item-config-form.tsx`
- สิ่งที่ไม่เปลี่ยน:
  - business logic, API routes, payload, schema, query keys, mutation behavior,
    state management, validation และ role permissions
  - Sidebar และ AppShell structure
- Guardrails:
  - ห้ามเพิ่ม selector กลางที่จับ `article`, `table` หรือ `.overflow-x-auto` ใต้
    `.market-workspace`
  - ต้อง reuse component ใน `page-kit.tsx` ก่อนสร้าง style หรือ component ใหม่
  - page-specific class ใช้ได้เฉพาะ layout/spacing; สี ขอบ เงา form และ interaction
    state ต้องอ้าง shared component หรือ semantic token
  - migration แต่ละชุดต้องผ่าน typecheck, tests และ production build
- ผลตรวจล่าสุด: Web typecheck ผ่าน, Web tests 23 tests ผ่าน และ Next.js production
  build ผ่าน
- สถานะ: design system foundation และหน้าหลักทั้งหมดถูก migrate แล้ว

## สถานะการตรวจสอบล่าสุด

- Service Account อ่าน Spreadsheet ได้
- Login ด้วยบัญชี active ใน Sheet ได้ HTTP 200
- Session endpoint ได้ HTTP 200 ผ่าน Next.js proxy
- API tests ผ่าน
- Web tests ผ่าน
- ผลตรวจล่าสุด: API 33 tests และ Web 23 tests ผ่านทั้งหมด
- TypeScript typecheck ผ่านทั้ง API และ Web
- Next.js production build ผ่าน
- `key.json` และ `apps/api/.env` ไม่ถูก track ใน Git
- local branch มี commits ที่ยังไม่ได้ push ขึ้น `origin/main`
