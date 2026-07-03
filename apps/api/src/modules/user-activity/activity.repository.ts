import type { ActivityFilters, ActivityUser, UserActivity, UserStats, XpTransaction } from "./activity.types.js";

export interface ActivityRepository {
  appendActivity(activity: UserActivity): Promise<void>;
  listActivities(filters: ActivityFilters): Promise<UserActivity[]>;
  appendXpTransaction(transaction: XpTransaction): Promise<void>;
  listXpTransactions(userId?: string): Promise<XpTransaction[]>;
  getUserStats(userId: string): Promise<UserStats | undefined>;
  listUserStats(): Promise<UserStats[]>;
  upsertUserStats(stats: UserStats): Promise<void>;
  listUsers(): Promise<ActivityUser[]>;
}
