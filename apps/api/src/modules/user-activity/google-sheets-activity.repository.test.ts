import type { sheets_v4 } from "googleapis";
import { describe, expect, it, vi } from "vitest";
import { GoogleSheetsInventoryRepository } from "../../repositories/google-sheets-inventory-repository.js";
import { GoogleSheetsActivityRepository } from "./google-sheets-activity.repository.js";
import type { UserActivity, UserStats, XpTransaction } from "./activity.types.js";

function createRepositories(values: Record<string, string[][]>) {
  const get = vi.fn(async ({ range }: { range: string }) => {
    const tab = range.split("!", 1)[0] ?? "";
    return { data: { values: values[tab] ?? [] } };
  });
  const append = vi.fn().mockResolvedValue({ data: {} });
  const batchUpdate = vi.fn().mockResolvedValue({ data: {} });
  const sheets = { spreadsheets: { values: { get, append, batchUpdate } } } as unknown as sheets_v4.Sheets;
  const inventory = new GoogleSheetsInventoryRepository(sheets, "spreadsheet-id");
  return { repository: new GoogleSheetsActivityRepository(inventory), get, append, batchUpdate };
}

const activityHeaders = ["Activity_ID", "Activity_Date", "User_ID", "Branch_ID", "Action", "Entity_Type", "Entity_ID", "Result", "Detail", "Metadata_JSON", "Created_At"];
const statsHeaders = ["User_ID", "Total_XP", "Current_Level", "Current_Level_XP", "Next_Level_XP", "Current_Streak", "Longest_Streak", "Last_Active_Date", "Last_XP_At", "Updated_At"];
const transactionHeaders = ["XP_Transaction_ID", "User_ID", "Activity_ID", "XP_Amount", "Reason", "Entity_Type", "Entity_ID", "Created_At"];

const activity: UserActivity = {
  activityId: "ACT-11111111-1111-4111-8111-111111111111",
  activityDate: "2026-07-04",
  userId: "U001",
  branchId: "B001",
  action: "REQUEST_CREATED",
  entityType: "REQUEST",
  entityId: "REQ-001",
  result: "SUCCESS",
  detail: "created",
  metadataJson: "{}",
  createdAt: "2026-07-04T00:00:00.000Z",
};

describe("GoogleSheetsActivityRepository", () => {
  it("appends User_Activities using the existing Sheets repository", async () => {
    const { repository, append } = createRepositories({});

    await repository.appendActivity(activity);

    expect(append).toHaveBeenCalledWith(expect.objectContaining({
      spreadsheetId: "spreadsheet-id",
      range: "User_Activities!A:K",
      requestBody: { values: [[activity.activityId, activity.activityDate, activity.userId, activity.branchId, activity.action, activity.entityType, activity.entityId, activity.result, activity.detail, activity.metadataJson, activity.createdAt]] },
    }));
  });

  it("finds activities by user and branch, newest first", async () => {
    const older = ["ACT-11111111-1111-4111-8111-111111111111", "2026-07-03", "U001", "B001", "REQUEST_CREATED", "REQUEST", "REQ-001", "SUCCESS", "", "", "2026-07-03T00:00:00.000Z"];
    const newer = ["ACT-22222222-2222-4222-8222-222222222222", "2026-07-04", "U001", "B002", "LOGIN_SUCCESS", "USER", "U001", "SUCCESS", "", "", "2026-07-04T00:00:00.000Z"];
    const other = ["ACT-33333333-3333-4333-8333-333333333333", "2026-07-04", "U002", "B001", "LOGIN_SUCCESS", "USER", "U002", "SUCCESS", "", "", "2026-07-04T01:00:00.000Z"];
    const { repository } = createRepositories({ User_Activities: [activityHeaders, older, newer, other] });

    await expect(repository.findActivitiesByUser("U001", { limit: 1 })).resolves.toMatchObject([{ activityId: newer[0] }]);
    await expect(repository.findActivitiesByBranch("B001")).resolves.toMatchObject([{ activityId: other[0] }, { activityId: older[0] }]);
  });

  it("finds and upserts User_Stats by User_ID", async () => {
    const row = ["U001", "5", "1", "5", "100", "1", "1", "2026-07-04", "2026-07-03T18:58:56.102Z", "2026-07-03T18:58:58.472Z"];
    const { repository, batchUpdate } = createRepositories({ User_Stats: [statsHeaders, row] });
    const stats = await repository.findUserStatsByUserId("U001");

    expect(stats).toMatchObject({ userId: "U001", totalXp: 5, currentLevel: 1 });
    await repository.saveUserStats({ ...stats, totalXp: 10 } as UserStats);
    expect(batchUpdate).toHaveBeenCalledWith(expect.objectContaining({ requestBody: expect.objectContaining({ data: [expect.objectContaining({ range: "User_Stats!A2:J2" })] }) }));
  });

  it("creates User_Stats when User_ID does not exist", async () => {
    const { repository, append } = createRepositories({ User_Stats: [statsHeaders] });
    const stats: UserStats = {
      userId: "U002",
      totalXp: 0,
      currentLevel: 1,
      currentLevelXp: 0,
      nextLevelXp: 100,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "",
      lastXpAt: "",
      updatedAt: "2026-07-04T00:00:00.000Z",
    };

    await repository.saveUserStats(stats);

    expect(append).toHaveBeenCalledWith(expect.objectContaining({
      range: "User_Stats!A:J",
      requestBody: { values: [["U002", 0, 1, 0, 100, 0, 0, "", "", "2026-07-04T00:00:00.000Z"]] },
    }));
  });

  it("finds and appends XP transactions by Activity_ID", async () => {
    const row = ["XPT-11111111-1111-4111-8111-111111111111", "U001", activity.activityId, "5", "manual", "REQUEST", "REQ-001", "2026-07-04T00:00:00.000Z"];
    const { repository, append } = createRepositories({ XP_Transactions: [transactionHeaders, row] });

    const transaction = await repository.findXpTransactionByActivityId(activity.activityId);
    expect(transaction).toMatchObject({ activityId: activity.activityId, xpAmount: 5 });
    await repository.appendXpTransaction(transaction as XpTransaction);
    expect(append).toHaveBeenCalledWith(expect.objectContaining({ range: "XP_Transactions!A:H" }));
  });
});
