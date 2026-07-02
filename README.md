# Restaurant Inventory MVP

ระบบ Inventory สำหรับร้านอาหารแบบ end-to-end ใช้ Next.js, Fastify และ Google Sheets
ภายใน pnpm workspace/Turborepo

## เริ่มใช้งาน

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm sheets:check
pnpm dev
```

เปิด `http://localhost:3000/login` โดย API รันที่พอร์ต 4000

คำสั่งตรวจสอบ:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

รายละเอียด architecture, Google Sheets schema, Service Account, Codespaces และ demo flow
อยู่ที่ [docs/inventory-mvp.md](docs/inventory-mvp.md)

ไฟล์รูปสินค้าแบบ local วางที่ `apps/web/public/images/items/` และบันทึกใน Sheet เช่น
`/images/items/water.webp`
