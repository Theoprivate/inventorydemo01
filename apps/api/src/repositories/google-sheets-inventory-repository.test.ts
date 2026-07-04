import type { sheets_v4 } from "googleapis";
import { describe, expect, it, vi } from "vitest";
import { SHEET_HEADERS, type EmployeeKpiDaily, type UserStats } from "../models.js";
import { GoogleSheetsInventoryRepository } from "./google-sheets-inventory-repository.js";

describe("GoogleSheetsInventoryRepository Items", () => {
  it("returns only rows containing both Item_ID and Item_Name", async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        values: [
          ["Item_ID", "Item_Name", "Category_ID", "Unit", "Image_URL", "Description", "Is_Active", "Created_At"],
          [],
          ["", "", "", "", "", "", "FALSE", ""],
          ["I-NAMELESS", "", "C1", "ชิ้น", "", "", "FALSE", ""],
          ["", "มีชื่ออย่างเดียว", "C1", "ชิ้น", "", "", "TRUE", ""],
          ["I1", "ข้าว", "C1", "kg", "/images/items/rice.webp", "", "TRUE", "now"],
        ],
      },
    });
    const sheets = { spreadsheets: { values: { get } } } as unknown as sheets_v4.Sheets;
    const repository = new GoogleSheetsInventoryRepository(sheets, "sheet-id");

    const records = await repository.read("Items");

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      Item_ID: "I1",
      Item_Name: "ข้าว",
      Category_ID: "C1",
      Image_URL: "/images/items/rice.webp",
      Is_Active: "TRUE",
    });
  });
});

describe("GoogleSheetsInventoryRepository Phase 1 models", () => {
  it("maps the exact headers used by the five Phase 1 sheets", () => {
    expect(SHEET_HEADERS.Users).toEqual(["User_ID", "Username", "Password", "Display_Name", "Role", "Branch_ID", "Is_Active", "Created_At", "Password_Hash", "Avatar_URL", "Last_Login_At", "Last_Active_At", "Updated_At"]);
    expect(SHEET_HEADERS.User_Activities).toHaveLength(11);
    expect(SHEET_HEADERS.User_Stats).toHaveLength(10);
    expect(SHEET_HEADERS.XP_Transactions).toHaveLength(8);
    expect(SHEET_HEADERS.Employee_KPI_Daily).toEqual(["KPI_ID", "KPI_Date", "User_ID", "Branch_ID", "Assigned_Tasks", "Completed_Tasks", "On_Time_Tasks", "Completion_Rate", "On_Time_Rate", "Stock_Count_Tasks", "Stock_Count_Accuracy", "Discrepancy_Count", "Requests_Created", "Requests_Approved", "Requests_Rejected", "Requests_Fulfilled", "Movements_Created", "Active_Minutes", "Login_Count", "Updated_At"]);
  });

  it("finds a user by Username and maps Password_Hash without exposing Password", async () => {
    const { repository, get } = createRepository();
    get.mockResolvedValue({ data: { values: [SHEET_HEADERS.Users, ["U1", "alice", "legacy-secret", "Alice", "staff", "B1", "TRUE", "created", "$argon2id$hash", "avatar", "login", "active", "updated"]] } });

    const user = await repository.findUserByUsername("alice");

    expect(user).toMatchObject({ userId: "U1", username: "alice", passwordHash: "$argon2id$hash", isActive: true });
    expect(user).not.toHaveProperty("password");
  });

  it("upserts User_Stats by User_ID instead of appending a duplicate user", async () => {
    const { repository, get, append, batchUpdate } = createRepository();
    get.mockResolvedValue({ data: { values: [SHEET_HEADERS.User_Stats, ["U1", 5, 1, 5, 100, 1, 1, "2026-07-04", "last-xp", "updated"]] } });
    const stats: UserStats = { userId: "U1", totalXp: 15, currentLevel: 1, currentLevelXp: 15, nextLevelXp: 100, currentStreak: 1, longestStreak: 1, lastActiveDate: "2026-07-04", lastXpAt: "last-xp", updatedAt: "now" };

    await repository.upsertUserStats(stats);

    expect(append).not.toHaveBeenCalled();
    expect(batchUpdate).toHaveBeenCalledWith(expect.objectContaining({ requestBody: expect.objectContaining({ data: [expect.objectContaining({ range: "User_Stats!A2:J2" })] }) }));
  });

  it("upserts KPI by User_ID and KPI_Date without creating a second daily row", async () => {
    const { repository, get, append, batchUpdate } = createRepository();
    get.mockResolvedValue({ data: { values: [SHEET_HEADERS.Employee_KPI_Daily, ["KPI-OLD", "2026-07-04", "U1", "B1", 1, 1, 1, 100, 100, 0, 100, 0, 1, 0, 0, 0, 0, 10, 1, "old"]] } });
    const kpi: EmployeeKpiDaily = { kpiId: "KPI-NEW", kpiDate: "2026-07-04", userId: "U1", branchId: "B1", assignedTasks: 2, completedTasks: 2, onTimeTasks: 2, completionRate: 100, onTimeRate: 100, stockCountTasks: 0, stockCountAccuracy: 100, discrepancyCount: 0, requestsCreated: 2, requestsApproved: 0, requestsRejected: 0, requestsFulfilled: 0, movementsCreated: 0, activeMinutes: 20, loginCount: 1, updatedAt: "now" };

    await repository.upsertDailyKpi(kpi);

    expect(append).not.toHaveBeenCalled();
    expect(batchUpdate).toHaveBeenCalledWith(expect.objectContaining({ requestBody: expect.objectContaining({ data: [expect.objectContaining({ range: "Employee_KPI_Daily!A2:T2", values: [expect.arrayContaining(["KPI-OLD"])] })] }) }));
  });
});

function createRepository() {
  const get = vi.fn();
  const append = vi.fn().mockResolvedValue({});
  const batchUpdate = vi.fn().mockResolvedValue({});
  const clear = vi.fn().mockResolvedValue({});
  const sheets = { spreadsheets: { values: { get, append, batchUpdate, clear } } } as unknown as sheets_v4.Sheets;
  return { repository: new GoogleSheetsInventoryRepository(sheets, "sheet-id"), get, append, batchUpdate };
}
