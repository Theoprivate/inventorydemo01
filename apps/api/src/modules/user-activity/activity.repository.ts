import type { ActivityListOptions, UserActivity, UserStats, XpTransaction } from "./activity.types.js";

export interface ActivityRepository {
  appendActivity(activity: UserActivity): Promise<void>;
  findActivitiesByUser(userId: string, options?: ActivityListOptions): Promise<UserActivity[]>;
  findActivitiesByBranch(branchId: string, options?: ActivityListOptions): Promise<UserActivity[]>;
  findUserStatsByUserId(userId: string): Promise<UserStats | undefined>;
  saveUserStats(stats: UserStats): Promise<void>;
  findXpTransactionByActivityId(activityId: string): Promise<XpTransaction | undefined>;
  appendXpTransaction(transaction: XpTransaction): Promise<void>;
}
