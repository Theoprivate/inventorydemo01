import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { SHEET_HEADERS, type SheetName, type SheetRecord } from "./models.js";
import type { InventoryRepository } from "./repositories/inventory-repository.js";

class MemoryRepository implements InventoryRepository {
  data = {} as Record<SheetName, SheetRecord[]>;
  constructor() { for (const tab of Object.keys(SHEET_HEADERS) as SheetName[]) this.data[tab] = []; }
  async read(tab: SheetName) { return structuredClone(this.data[tab]); }
  async append(tab: SheetName, records: SheetRecord[]) { this.data[tab].push(...structuredClone(records)); }
  async createStockRequest(request: SheetRecord, items: SheetRecord[]) { if (this.data.Stock_Requests.some((row) => row.Request_ID === request.Request_ID)) return false; this.data.Stock_Requests.push(structuredClone(request)); this.data.Stock_Request_Items.push(...structuredClone(items)); return true; }
  async upsert(tab: SheetName, key: string, records: SheetRecord[]) { for (const record of records) { const index = this.data[tab].findIndex((row) => row[key] === record[key]); if (index >= 0) this.data[tab][index] = structuredClone(record); else this.data[tab].push(structuredClone(record)); } }
  async clearAndWrite(tab: SheetName, records: SheetRecord[]) { this.data[tab] = structuredClone(records); }
  invalidate() {}
  async checkSchema() { return (Object.keys(SHEET_HEADERS) as SheetName[]).map((tab) => ({ tab, missingHeaders: [], exists: true })); }
}

describe("inventory API", () => {
  const repository = new MemoryRepository(); let app: FastifyInstance; let cookie = "";
  beforeAll(async () => {
    process.env.JWT_SECRET = "unit-test-secret-that-is-not-used-outside-tests";
    repository.data.Users = [{ User_ID: "U1", Username: "staff", Password: "pass", Display_Name: "Staff", Role: "staff", Branch_ID: "B1", Is_Active: "TRUE", Created_At: "" }];
    repository.data.Branches = [{ Branch_ID: "B1", Branch_Name: "Demo", Is_Active: "TRUE", Created_At: "" }];
    repository.data.Categories = [{ Category_ID: "C1", Category_Name: "วัตถุดิบ", Sort_Order: 1, Is_Active: "TRUE" }];
    repository.data.Items = [{ Item_ID: "I1", Item_Name: "ข้าว", Category_ID: "C1", Unit: "kg", Image_URL: "", Description: "", Is_Active: "TRUE", Created_At: "" }];
    repository.data.Store_Items = [{ Store_Item_ID: "SI1", Branch_ID: "B1", Item_ID: "I1", Min_Qty: 1, Target_Qty: 10, Default_Location_ID: "L2", Allow_Request: "TRUE", Require_Daily_Count: "TRUE", Is_Active: "TRUE" }];
    app = await buildApp(repository); await app.ready();
    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { username: "staff", password: "pass" } });
    expect(login.statusCode).toBe(200); cookie = String(login.headers["set-cookie"]).split(";", 1)[0];
  });
  afterAll(async () => app.close());
  it("authenticates with an httpOnly cookie", async () => { const response = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { cookie } }); expect(response.statusCode).toBe(200); expect(response.json().data).not.toHaveProperty("password"); });
  it("enforces backend RBAC", async () => { const response = await app.inject({ method: "POST", url: "/api/v1/items", headers: { cookie }, payload: { itemName: "x", categoryId: "C1", unit: "ea" } }); expect(response.statusCode).toBe(403); });
  it("allows staff to create a request and returns the stable contract", async () => { const response = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie }, payload: { note: "test", items: [{ itemId: "I1", requestedQty: 2, unit: "kg" }] } }); expect(response.statusCode).toBe(200); expect(response.json()).toMatchObject({ ok: true, data: { status: "PENDING", itemCount: 1 } }); expect(repository.data.Stock_Requests).toHaveLength(1); expect(repository.data.Stock_Request_Items).toHaveLength(1); });
  it("rejects an empty backpack", async () => { const response = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie }, payload: { items: [] } }); expect(response.statusCode).toBe(400); expect(response.json().error.code).toBe("VALIDATION_ERROR"); });
  it("rejects zero and negative quantities", async () => { for (const requestedQty of [0, -1]) { const response = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie }, payload: { items: [{ itemId: "I1", requestedQty, unit: "kg" }] } }); expect(response.statusCode).toBe(400); } });
  it("merges duplicate items before writing", async () => { const before = repository.data.Stock_Request_Items.length; const response = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie }, payload: { items: [{ itemId: "I1", requestedQty: 2, unit: "kg" }, { itemId: "I1", requestedQty: 3, unit: "kg" }] } }); expect(response.json().data.itemCount).toBe(1); expect(repository.data.Stock_Request_Items[before]?.Requested_Qty).toBe(5); });
  it("does not duplicate a retried request with the same idempotency key", async () => { const key = "123e4567-e89b-42d3-a456-426614174000"; const payload = { items: [{ itemId: "I1", requestedQty: 1, unit: "kg" }] }; const before = repository.data.Stock_Requests.length; const first = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie, "idempotency-key": key }, payload }); const second = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie, "idempotency-key": key }, payload }); expect(second.json().data.requestId).toBe(first.json().data.requestId); expect(repository.data.Stock_Requests).toHaveLength(before + 1); });
});
