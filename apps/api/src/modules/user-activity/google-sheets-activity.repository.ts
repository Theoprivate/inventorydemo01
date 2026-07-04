import type { SheetRecord } from "../../models.js";
import type { InventoryRepository } from "../../repositories/inventory-repository.js";
import { numberCell, stringCell } from "../../utils/sheets.js";
import type { ActivityRepository } from "./activity.repository.js";
import type { ActivityAction, ActivityEntityType, ActivityListOptions, ActivityResult, UserActivity, UserStats, XpTransaction } from "./activity.types.js";

export class GoogleSheetsActivityRepository implements ActivityRepository {
  constructor(private readonly repository: InventoryRepository) {}

  async appendActivity(activity: UserActivity): Promise<void> {
    await this.repository.append("User_Activities", [activityRecord(activity)]);
  }

  async findActivitiesByUser(userId: string, options?: ActivityListOptions): Promise<UserActivity[]> {
    return this.findActivities((activity) => activity.userId === userId, options);
  }

  async findActivitiesByBranch(branchId: string, options?: ActivityListOptions): Promise<UserActivity[]> {
    return this.findActivities((activity) => activity.branchId === branchId, options);
  }

  async findUserStatsByUserId(userId: string): Promise<UserStats | undefined> {
    const rows = await this.repository.read("User_Stats", { fresh: true });
    return rows.map(mapUserStats).find((stats) => stats.userId === userId);
  }

  async saveUserStats(stats: UserStats): Promise<void> {
    await this.repository.upsert("User_Stats", "User_ID", [userStatsRecord(stats)]);
  }

  async findXpTransactionByActivityId(activityId: string): Promise<XpTransaction | undefined> {
    const rows = await this.repository.read("XP_Transactions", { fresh: true });
    return rows.map(mapXpTransaction).find((transaction) => transaction.activityId === activityId);
  }

  async appendXpTransaction(transaction: XpTransaction): Promise<void> {
    await this.repository.append("XP_Transactions", [xpTransactionRecord(transaction)]);
  }

  private async findActivities(predicate: (activity: UserActivity) => boolean, options?: ActivityListOptions): Promise<UserActivity[]> {
    const rows = await this.repository.read("User_Activities", { fresh: true });
    const values = rows.map(mapActivity).filter(predicate).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return options?.limit === undefined ? values : values.slice(0, options.limit);
  }
}

function activityRecord(value: UserActivity): SheetRecord {
  return {
    Activity_ID: value.activityId,
    Activity_Date: value.activityDate,
    User_ID: value.userId,
    Branch_ID: value.branchId,
    Action: value.action,
    Entity_Type: value.entityType,
    Entity_ID: value.entityId,
    Result: value.result,
    Detail: value.detail,
    Metadata_JSON: value.metadataJson,
    Created_At: value.createdAt,
  };
}

function mapActivity(record: SheetRecord): UserActivity {
  return {
    activityId: stringCell(record.Activity_ID),
    activityDate: stringCell(record.Activity_Date),
    userId: stringCell(record.User_ID),
    branchId: stringCell(record.Branch_ID),
    action: stringCell(record.Action) as ActivityAction,
    entityType: stringCell(record.Entity_Type) as ActivityEntityType,
    entityId: stringCell(record.Entity_ID),
    result: stringCell(record.Result) as ActivityResult,
    detail: stringCell(record.Detail),
    metadataJson: stringCell(record.Metadata_JSON),
    createdAt: stringCell(record.Created_At),
  };
}

function userStatsRecord(value: UserStats): SheetRecord {
  return {
    User_ID: value.userId,
    Total_XP: value.totalXp,
    Current_Level: value.currentLevel,
    Current_Level_XP: value.currentLevelXp,
    Next_Level_XP: value.nextLevelXp,
    Current_Streak: value.currentStreak,
    Longest_Streak: value.longestStreak,
    Last_Active_Date: value.lastActiveDate,
    Last_XP_At: value.lastXpAt,
    Updated_At: value.updatedAt,
  };
}

function mapUserStats(record: SheetRecord): UserStats {
  return {
    userId: stringCell(record.User_ID),
    totalXp: numberCell(record.Total_XP),
    currentLevel: numberCell(record.Current_Level),
    currentLevelXp: numberCell(record.Current_Level_XP),
    nextLevelXp: numberCell(record.Next_Level_XP),
    currentStreak: numberCell(record.Current_Streak),
    longestStreak: numberCell(record.Longest_Streak),
    lastActiveDate: stringCell(record.Last_Active_Date),
    lastXpAt: stringCell(record.Last_XP_At),
    updatedAt: stringCell(record.Updated_At),
  };
}

function xpTransactionRecord(value: XpTransaction): SheetRecord {
  return {
    XP_Transaction_ID: value.xpTransactionId,
    User_ID: value.userId,
    Activity_ID: value.activityId,
    XP_Amount: value.xpAmount,
    Reason: value.reason,
    Entity_Type: value.entityType,
    Entity_ID: value.entityId,
    Created_At: value.createdAt,
  };
}

function mapXpTransaction(record: SheetRecord): XpTransaction {
  return {
    xpTransactionId: stringCell(record.XP_Transaction_ID),
    userId: stringCell(record.User_ID),
    activityId: stringCell(record.Activity_ID),
    xpAmount: numberCell(record.XP_Amount),
    reason: stringCell(record.Reason),
    entityType: stringCell(record.Entity_Type) as ActivityEntityType,
    entityId: stringCell(record.Entity_ID),
    createdAt: stringCell(record.Created_At),
  };
}
