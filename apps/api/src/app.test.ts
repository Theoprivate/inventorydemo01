import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { buildApp } from "./app.js";
import { SHEET_HEADERS, type EmployeeKpiDaily, type SheetName, type SheetRecord, type UserActivity, type UserStats, type XpTransaction } from "./models.js";
import type { InventoryRepository } from "./repositories/inventory-repository.js";
import { employeeKpiDailyRecord, mapEmployeeKpiDaily, mapUser, mapUserActivity, mapUserStats, mapXpTransaction, userActivityRecord, userStatsRecord, xpTransactionRecord } from "./utils/mappers.js";

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
  async findUserById(userId: string) { return this.data.Users.map(mapUser).find((user) => user.userId === userId); }
  async findUserByUsername(username: string) { return this.data.Users.map(mapUser).find((user) => user.username === username); }
  async updateLastLogin(userId: string, timestamp: string) { this.updateUserTimestamp(userId, "Last_Login_At", timestamp); }
  async updateLastActive(userId: string, timestamp: string) { this.updateUserTimestamp(userId, "Last_Active_At", timestamp); }
  async appendActivity(activity: UserActivity) { this.data.User_Activities.push(userActivityRecord(activity)); }
  async findActivitiesByUser(userId: string) { return this.data.User_Activities.map(mapUserActivity).filter((activity) => activity.userId === userId); }
  async findActivityById(activityId: string) { return this.data.User_Activities.map(mapUserActivity).find((activity) => activity.activityId === activityId); }
  async findActivityByEntity(entityType: string, entityId: string) { return this.data.User_Activities.map(mapUserActivity).filter((activity) => activity.entityType === entityType && activity.entityId === entityId); }
  async appendXpTransaction(transaction: XpTransaction) { this.data.XP_Transactions.push(xpTransactionRecord(transaction)); }
  async findXpTransactionsByUser(userId: string) { return this.data.XP_Transactions.map(mapXpTransaction).filter((transaction) => transaction.userId === userId); }
  async findXpTransactionByActivityId(activityId: string) { return this.data.XP_Transactions.map(mapXpTransaction).find((transaction) => transaction.activityId === activityId); }
  async sumXpByUser(userId: string) { return (await this.findXpTransactionsByUser(userId)).reduce((total, transaction) => total + transaction.xpAmount, 0); }
  async findUserStats(userId: string) { return this.data.User_Stats.map(mapUserStats).find((stats) => stats.userId === userId); }
  async upsertUserStats(stats: UserStats) { await this.upsert("User_Stats", "User_ID", [userStatsRecord(stats)]); }
  async findDailyKpi(userId: string, kpiDate: string) { return this.data.Employee_KPI_Daily.map(mapEmployeeKpiDaily).find((kpi) => kpi.userId === userId && kpi.kpiDate === kpiDate); }
  async upsertDailyKpi(kpi: EmployeeKpiDaily) { const existing = await this.findDailyKpi(kpi.userId, kpi.kpiDate); await this.upsert("Employee_KPI_Daily", "KPI_ID", [employeeKpiDailyRecord(existing ? { ...kpi, kpiId: existing.kpiId } : kpi)]); }
  private updateUserTimestamp(userId: string, header: "Last_Login_At" | "Last_Active_At", timestamp: string) { const user = this.data.Users.find((row) => row.User_ID === userId); if (user) { user[header] = timestamp; user.Updated_At = timestamp; } }
}

describe("inventory API", () => {
  const repository = new MemoryRepository(); let app: FastifyInstance; let cookie = ""; const roleCookies: Partial<Record<"owner" | "manager" | "stock" | "staff", string>> = {};
  beforeAll(async () => {
    process.env.JWT_SECRET = "unit-test-secret-that-is-not-used-outside-tests";
    const passwordHash = await argon2.hash("pass", { type: argon2.argon2id });
    repository.data.Users = [
      { User_ID: "U1", Username: "staff", Password: "wrong-plain", Display_Name: "Staff", Role: "staff", Branch_ID: "B1", Is_Active: "TRUE", Created_At: "", Password_Hash: passwordHash, Avatar_URL: "", Last_Login_At: "", Last_Active_At: "", Updated_At: "" },
      { User_ID: "U2", Username: "owner", Password: "wrong-plain", Display_Name: "Owner", Role: "owner", Branch_ID: "B1", Is_Active: "TRUE", Created_At: "", Password_Hash: passwordHash, Avatar_URL: "", Last_Login_At: "", Last_Active_At: "", Updated_At: "" },
      { User_ID: "U3", Username: "manager", Password: "wrong-plain", Display_Name: "Manager", Role: "manager", Branch_ID: "B1", Is_Active: "TRUE", Created_At: "", Password_Hash: passwordHash, Avatar_URL: "", Last_Login_At: "", Last_Active_At: "", Updated_At: "" },
      { User_ID: "U4", Username: "stock", Password: "wrong-plain", Display_Name: "Stock", Role: "stock", Branch_ID: "B1", Is_Active: "TRUE", Created_At: "", Password_Hash: passwordHash, Avatar_URL: "", Last_Login_At: "", Last_Active_At: "", Updated_At: "" },
      { User_ID: "U5", Username: "legacy", Password: "pass", Display_Name: "Legacy", Role: "staff", Branch_ID: "B1", Is_Active: "TRUE", Created_At: "", Password_Hash: "", Avatar_URL: "", Last_Login_At: "", Last_Active_At: "", Updated_At: "" },
      { User_ID: "U6", Username: "inactive", Password: "", Display_Name: "Inactive", Role: "staff", Branch_ID: "B1", Is_Active: "FALSE", Created_At: "", Password_Hash: passwordHash, Avatar_URL: "", Last_Login_At: "", Last_Active_At: "", Updated_At: "" },
    ];
    repository.data.Branches = [{ Branch_ID: "B1", Branch_Name: "Demo", Is_Active: "TRUE", Created_At: "" }];
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
  it("authenticates with Password_Hash, updates Last_Login_At, and does not expose password fields", async () => { const response = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { cookie } }); expect(response.statusCode).toBe(200); expect(response.json().data).not.toHaveProperty("password"); expect(response.json().data).not.toHaveProperty("passwordHash"); expect(repository.data.Users.find((row) => row.User_ID === "U1")?.Last_Login_At).toBeTruthy(); });
  it("does not allow the legacy plain-text Password column to authenticate", async () => { const response = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { username: "legacy", password: "pass" } }); expect(response.statusCode).toBe(401); });
  it("does not allow inactive users to authenticate", async () => { const response = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { username: "inactive", password: "pass" } }); expect(response.statusCode).toBe(401); });
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
});
