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
  const repository = new MemoryRepository(); let app: FastifyInstance; let cookie = ""; const roleCookies: Partial<Record<"owner" | "manager" | "stock" | "staff", string>> = {};
  beforeAll(async () => {
    process.env.JWT_SECRET = "unit-test-secret-that-is-not-used-outside-tests";
    repository.data.Users = [
      { User_ID: "U1", Username: "staff", Password: "pass", Display_Name: "Staff", Role: "staff", Branch_ID: "B1", Is_Active: "TRUE", Created_At: "" },
      { User_ID: "U2", Username: "owner", Password: "pass", Display_Name: "Owner", Role: "owner", Branch_ID: "B1", Is_Active: "TRUE", Created_At: "" },
      { User_ID: "U3", Username: "manager", Password: "pass", Display_Name: "Manager", Role: "manager", Branch_ID: "B1", Is_Active: "TRUE", Created_At: "" },
      { User_ID: "U4", Username: "stock", Password: "pass", Display_Name: "Stock", Role: "stock", Branch_ID: "B1", Is_Active: "TRUE", Created_At: "" },
      { User_ID: "U5", Username: "other-staff", Password: "pass", Display_Name: "Other Staff", Role: "staff", Branch_ID: "B2", Is_Active: "TRUE", Created_At: "" },
    ];
    repository.data.Branches = [{ Branch_ID: "B1", Branch_Name: "Demo", Is_Active: "TRUE", Created_At: "" }, { Branch_ID: "B2", Branch_Name: "Other", Is_Active: "TRUE", Created_At: "" }];
    repository.data.Categories = [{ Category_ID: "C1", Category_Name: "วัตถุดิบ", Sort_Order: 1, Is_Active: "TRUE" }];
    repository.data.Items = [
      { Item_ID: "I1", Item_Name: "ข้าว", Category_ID: "C1", Unit: "kg", Image_URL: "", Description: "", Is_Active: "TRUE", Created_At: "created-at" },
      { Item_ID: "I2", Item_Name: "ปิดใช้งาน", Category_ID: "C1", Unit: "ชิ้น", Image_URL: "/images/items/inactive.webp", Description: "", Is_Active: "FALSE", Created_At: "created-at" },
      { Item_ID: "", Item_Name: "", Category_ID: "", Unit: "", Image_URL: "", Description: "", Is_Active: "FALSE", Created_At: "" },
      { Item_ID: "I3", Item_Name: "", Category_ID: "C1", Unit: "ชิ้น", Image_URL: "", Description: "", Is_Active: "FALSE", Created_At: "" },
      { Item_ID: "", Item_Name: "มีชื่ออย่างเดียว", Category_ID: "C1", Unit: "ชิ้น", Image_URL: "", Description: "", Is_Active: "TRUE", Created_At: "" },
    ];
    repository.data.Store_Items = [
      { Store_Item_ID: "SI1", Branch_ID: "B1", Item_ID: "I1", Min_Qty: 1, Target_Qty: 10, Default_Location_ID: "L2", Allow_Request: "TRUE", Require_Daily_Count: "TRUE", Is_Active: "TRUE" },
      { Store_Item_ID: "SI2", Branch_ID: "B1", Item_ID: "I2", Min_Qty: 1, Target_Qty: 10, Default_Location_ID: "L2", Allow_Request: "TRUE", Require_Daily_Count: "FALSE", Is_Active: "TRUE" },
    ];
    app = await buildApp(repository); await app.ready();
    for (const role of ["owner", "manager", "stock", "staff"] as const) {
      const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { username: role, password: "pass" } });
      expect(login.statusCode).toBe(200); roleCookies[role] = String(login.headers["set-cookie"]).split(";", 1)[0];
    }
    cookie = roleCookies.staff ?? "";
  });
  afterAll(async () => app.close());
  it("authenticates with an httpOnly cookie", async () => { const response = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { cookie } }); expect(response.statusCode).toBe(200); expect(response.json().data).not.toHaveProperty("password"); });
  it("enforces backend RBAC", async () => { const response = await app.inject({ method: "POST", url: "/api/v1/items", headers: { cookie }, payload: { itemName: "x", categoryId: "C1", unit: "ea" } }); expect(response.statusCode).toBe(403); });
  it("allows owner and manager to update an item by Item_ID", async () => {
    const before = repository.data.Items.length;
    for (const [role, imageUrl] of [["owner", "/images/items/rice.webp"], ["manager", "https://cdn.example.test/rice.webp"]] as const) {
      const response = await app.inject({ method: "PATCH", url: "/api/v1/items/I1", headers: { cookie: roleCookies[role] }, payload: { imageUrl } });
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toMatchObject({ itemId: "I1", imageUrl });
      expect(repository.data.Items).toHaveLength(before);
      expect(repository.data.Items.find((row) => row.Item_ID === "I1")).toMatchObject({ Image_URL: imageUrl, Created_At: "created-at" });
    }
  });
  it("forbids stock and staff from editing items", async () => {
    for (const role of ["stock", "staff"] as const) {
      const response = await app.inject({ method: "PATCH", url: "/api/v1/items/I1", headers: { cookie: roleCookies[role] }, payload: { itemName: "ห้ามแก้" } });
      expect(response.statusCode).toBe(403);
    }
  });
  it("returns the updated Image_URL in item and market responses", async () => {
    const itemsResponse = await app.inject({ method: "GET", url: "/api/v1/items", headers: { cookie } });
    const marketResponse = await app.inject({ method: "GET", url: "/api/v1/requestable-items", headers: { cookie } });
    expect(itemsResponse.json().data.find((item: { itemId: string }) => item.itemId === "I1").imageUrl).toBe("https://cdn.example.test/rice.webp");
    expect(marketResponse.json().data.find((item: { itemId: string }) => item.itemId === "I1").imageUrl).toBe("https://cdn.example.test/rice.webp");
  });
  it("does not expose inactive master items in the market", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/requestable-items", headers: { cookie } });
    expect(response.json().data.some((item: { itemId: string }) => item.itemId === "I2")).toBe(false);
  });
  it("does not return blank or nameless rows as items", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/items", headers: { cookie } });
    expect(response.json().data).toHaveLength(2);
    expect(response.json().data.map((item: { itemId: string }) => item.itemId)).toEqual(["I1", "I2"]);
  });
  it("allows staff to create a request and returns the stable contract", async () => { const response = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie }, payload: { note: "test", items: [{ itemId: "I1", requestedQty: 2, unit: "kg" }] } }); expect(response.statusCode).toBe(200); expect(response.json()).toMatchObject({ ok: true, data: { status: "PENDING", itemCount: 1 } }); expect(repository.data.Stock_Requests).toHaveLength(1); expect(repository.data.Stock_Request_Items).toHaveLength(1); });
  it("rejects an empty backpack", async () => { const response = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie }, payload: { items: [] } }); expect(response.statusCode).toBe(400); expect(response.json().error.code).toBe("VALIDATION_ERROR"); });
  it("rejects zero and negative quantities", async () => { for (const requestedQty of [0, -1]) { const response = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie }, payload: { items: [{ itemId: "I1", requestedQty, unit: "kg" }] } }); expect(response.statusCode).toBe(400); } });
  it("merges duplicate items before writing", async () => { const before = repository.data.Stock_Request_Items.length; const response = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie }, payload: { items: [{ itemId: "I1", requestedQty: 2, unit: "kg" }, { itemId: "I1", requestedQty: 3, unit: "kg" }] } }); expect(response.json().data.itemCount).toBe(1); expect(repository.data.Stock_Request_Items[before]?.Requested_Qty).toBe(5); });
  it("does not duplicate a retried request with the same idempotency key", async () => { const key = "123e4567-e89b-42d3-a456-426614174000"; const payload = { items: [{ itemId: "I1", requestedQty: 1, unit: "kg" }] }; const before = repository.data.Stock_Requests.length; const first = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie, "idempotency-key": key }, payload }); const second = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie, "idempotency-key": key }, payload }); expect(second.json().data.requestId).toBe(first.json().data.requestId); expect(repository.data.Stock_Requests).toHaveLength(before + 1); });
  it("forbids staff from team stats", async () => { const response = await app.inject({ method: "GET", url: "/api/team/stats", headers: { cookie } }); expect(response.statusCode).toBe(403); });
  it("limits manager team stats to the authenticated branch", async () => { const response = await app.inject({ method: "GET", url: "/api/team/stats", headers: { cookie: roleCookies.manager } }); expect(response.statusCode).toBe(200); expect(response.json().data.length).toBeGreaterThan(0); expect(response.json().data.every((value: { branchId: string }) => value.branchId === "B1")).toBe(true); expect(response.json().data.some((value: { userId: string }) => value.userId === "U5")).toBe(false); });
  it("returns only the authenticated user's activities and stats", async () => {
    const [activities, stats] = await Promise.all([
      app.inject({ method: "GET", url: "/api/me/activities?limit=100", headers: { cookie } }),
      app.inject({ method: "GET", url: "/api/me/stats", headers: { cookie } }),
    ]);
    expect(activities.statusCode).toBe(200);
    expect(activities.json().data.length).toBeGreaterThan(0);
    expect(activities.json().data.every((value: { userId: string }) => value.userId === "U1")).toBe(true);
    expect(stats.json().data).toMatchObject({ userId: "U1", role: "staff", branchId: "B1", level: 1 });
  });
  it("forces manager activity-log queries to the authenticated branch", async () => { const response = await app.inject({ method: "GET", url: "/api/activity-log?branchId=B2&limit=100", headers: { cookie: roleCookies.manager } }); expect(response.statusCode).toBe(200); expect(response.json().data.length).toBeGreaterThan(0); expect(response.json().data.every((value: { branchId: string }) => value.branchId === "B1")).toBe(true); });
  it("does not reward a draft stock count", async () => {
    const before = repository.data.XP_Transactions.length;
    const response = await app.inject({ method: "POST", url: "/api/v1/stock-counts", headers: { cookie: roleCookies.stock }, payload: { locationId: "L1", countRound: "ADHOC", status: "DRAFT", items: [{ itemId: "I1", countedQty: 0, unit: "kg" }] } });
    expect(response.statusCode).toBe(200);
    expect(repository.data.User_Activities.at(-1)).toMatchObject({ Action: "STOCK_COUNT_STARTED", Entity_ID: response.json().data.countId });
    expect(repository.data.XP_Transactions).toHaveLength(before);
  });
});
