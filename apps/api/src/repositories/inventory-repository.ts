import type { EmployeeKpiDaily, SheetName, SheetRecord, User, UserActivity, UserStats, XpTransaction } from "../models.js";

export interface InventoryRepository {
  read(tab: SheetName, options?: { fresh?: boolean }): Promise<SheetRecord[]>;
  append(tab: SheetName, records: SheetRecord[]): Promise<void>;
  createStockRequest(request: SheetRecord, items: SheetRecord[]): Promise<boolean>;
  upsert(tab: SheetName, keyHeader: string, records: SheetRecord[]): Promise<void>;
  clearAndWrite(tab: SheetName, records: SheetRecord[]): Promise<void>;
  invalidate(tab?: SheetName): void;
  checkSchema(): Promise<Array<{ tab: SheetName; missingHeaders: string[]; exists: boolean }>>;
  findUserById(userId: string): Promise<User | undefined>;
  findUserByUsername(username: string): Promise<User | undefined>;
  updateLastLogin(userId: string, timestamp: string): Promise<void>;
  updateLastActive(userId: string, timestamp: string): Promise<void>;
  appendActivity(activity: UserActivity): Promise<void>;
  findActivitiesByUser(userId: string): Promise<UserActivity[]>;
  findActivityById(activityId: string): Promise<UserActivity | undefined>;
  findActivityByEntity(entityType: string, entityId: string): Promise<UserActivity[]>;
  appendXpTransaction(transaction: XpTransaction): Promise<void>;
  findXpTransactionsByUser(userId: string): Promise<XpTransaction[]>;
  findXpTransactionByActivityId(activityId: string): Promise<XpTransaction | undefined>;
  sumXpByUser(userId: string): Promise<number>;
  findUserStats(userId: string): Promise<UserStats | undefined>;
  upsertUserStats(stats: UserStats): Promise<void>;
  findDailyKpi(userId: string, kpiDate: string): Promise<EmployeeKpiDaily | undefined>;
  upsertDailyKpi(kpi: EmployeeKpiDaily): Promise<void>;
}
