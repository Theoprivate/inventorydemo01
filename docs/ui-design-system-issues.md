# UI Design System Issues

## DS-001: Global market styles leaked into unrelated pages

Status: Foundation fixed; page migration pending

### Problem

หน้า `inventory/request` มี visual style ที่สอดคล้องกับ reference เพราะใช้ component
เฉพาะใน `inventory-market.tsx` แต่หน้าอื่นยังพึ่ง style เก่าใน `globals.css` และ
`page-kit.tsx` มี shared component ไม่เพียงพอ

selector กลาง เช่น `.market-workspace article:not(.market-card)`, selector ที่จับ
`.overflow-x-auto`, table elements, `.border-dashed` และ fixed form ทำให้ element
ทุกชนิดใต้ workspace ได้ขอบดำและเงาดำโดยไม่ตั้งใจ ผลคือแต่ละหน้าแก้ visual style
แยกจากกันได้ยากและมีลักษณะเป็นกล่องแข็งแบบ legacy dashboard

### Root cause

- Presentation ถูกผูกกับ HTML element และ utility class ที่ใช้ทั่วระบบ
- Shared UI primitives รองรับเพียง header, error, empty state และ badge
- Style ที่ควร reuse ถูกเก็บไว้ใน component เฉพาะของหน้า `inventory/request`
- หน้าเดิมต้องเขียน `className` ยาวและกำหนดสี/ขอบ/เงาซ้ำ

### Implemented foundation

- เพิ่ม semantic design tokens สำหรับ cream, brown, caramel, border, status colors
  และ pixel shadows ใน `globals.css`
- เพิ่ม `GamePanel`, `GameCard`, `GameButton`, `StatusBadge`, `FilterBar`,
  `FormField`, `SelectableTile`, `DataTableShell`, `EmptyState` และ `ActionBar`
  ใน `page-kit.tsx`
- ปรับ legacy classes `.btn-primary`, `.btn-secondary`, `.field` และ `.panel`
  ให้ใช้ token กลางระหว่างช่วง migration
- ให้ shared UI ใน `inventory-market.tsx` reuse primitives จาก `page-kit.tsx`
- ลบ generic workspace selectors และจำกัด style ไว้ที่ component classes เช่น
  `.game-table-shell` และ `.pixel-modal`

### Remaining work

- Migrate แต่ละหน้าทีละหน้าไปใช้ component กลาง โดยไม่เปลี่ยน business logic
- แทน card markup ที่กำหนด border/shadow เองด้วย `GameCard` หรือ `GamePanel`
- แทน filter rows ด้วย `FilterBar` และ `SelectableTile`
- แทน form labels/fields ด้วย `FormField`
- ครอบตารางด้วย `DataTableShell`
- แทน sticky submit areas ด้วย `ActionBar`
- หลัง migrate ครบ ให้ลบ compatibility classes และ compatibility exports ที่ไม่ใช้แล้ว

### Guardrails

- ห้ามเพิ่ม selector กลางที่จับ `article`, `table` หรือ `.overflow-x-auto` ใต้
  `.market-workspace`
- Style ใหม่ต้องผูกกับ component class ที่มีชื่อชัดเจน
- ห้ามเปลี่ยน API, route, state, schema หรือ business logic ระหว่าง UI migration
- ต้องผ่าน typecheck, tests และ production build หลังแต่ละ migration batch
