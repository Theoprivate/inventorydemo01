import { createId } from "../../utils/ids.js";
import { calculateLevel } from "./calculate-level.js";
import type { ActivityRepository } from "./activity.repository.js";
import type { ActivityFilters, ActivityRecordResult, RecordActivityInput, UserActivity, UserStats, XpTransaction } from "./activity.types.js";
import { xpForAction } from "./xp-rules.js";

const BANGKOK_TIME_ZONE = "Asia/Bangkok";
const ALL_ROWS_LIMIT = 1_000_000;

interface ActivityLogger { error(context: unknown, message?: string): void }
interface ActivityServiceOptions { now?: () => Date; logger?: ActivityLogger }

export class ActivityService {
  private readonly now: () => Date;
  private readonly logger: ActivityLogger;

  constructor(private readonly repository: ActivityRepository, options: ActivityServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.logger = options.logger ?? console;
  }

  async recordActivity(input: RecordActivityInput): Promise<ActivityRecordResult> {
    const timestamp = this.now();
    const activity: UserActivity = {
      activityId: createId("ACT"),
      activityDate: bangkokDate(timestamp),
      userId: input.userId,
      branchId: input.branchId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      result: input.result,
      detail: input.detail?.trim() ?? "",
      metadataJson: safeMetadataJson(input.metadata),
      createdAt: timestamp.toISOString(),
    };
    await this.repository.appendActivity(activity);
    const reward = await this.awardXpForActivity(activity);
    return { activity, ...reward };
  }

  async recordActivitySafely(input: RecordActivityInput): Promise<ActivityRecordResult | null> {
    try {
      return await this.recordActivity(input);
    } catch (error) {
      this.logger.error({ error, action: input.action, userId: input.userId, entityId: input.entityId }, "Failed to record user activity");
      return null;
    }
  }

  async awardXpForActivity(activity: UserActivity): Promise<{ xpAwarded: number; alreadyRewarded: boolean }> {
    const xpAmount = activity.result === "SUCCESS" ? xpForAction(activity.action) : 0;
    const transactions = await this.repository.listXpTransactions(activity.userId);
    const sameActivity = transactions.find((value) => value.activityId === activity.activityId);
    let duplicateReward = Boolean(sameActivity);

    if (!duplicateReward && xpAmount > 0) {
      const rewardedActivityIds = new Set(transactions.map((value) => value.activityId));
      const priorActivities = await this.repository.listActivities({ userId: activity.userId, limit: ALL_ROWS_LIMIT });
      duplicateReward = priorActivities.some((value) => {
        if (value.activityId === activity.activityId || !rewardedActivityIds.has(value.activityId) || value.action !== activity.action) return false;
        if (activity.action === "LOGIN_SUCCESS") return value.activityDate === activity.activityDate;
        return value.entityType === activity.entityType && value.entityId === activity.entityId;
      });
    }

    let awarded = 0;
    if (xpAmount > 0 && !duplicateReward) {
      const transaction: XpTransaction = {
        xpTransactionId: createId("XPT"),
        userId: activity.userId,
        activityId: activity.activityId,
        xpAmount,
        reason: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        createdAt: activity.createdAt,
      };
      await this.repository.appendXpTransaction(transaction);
      awarded = xpAmount;
    }

    if (activity.result === "SUCCESS") await this.refreshUserStats(activity, awarded > 0);
    return { xpAwarded: awarded, alreadyRewarded: xpAmount > 0 && duplicateReward };
  }

  async meStats(user: { userId: string; displayName: string; role: string; branchId: string }) {
    const stats = await this.repository.getUserStats(user.userId);
    const level = calculateLevel(stats?.totalXp ?? 0);
    return { userId: user.userId, displayName: user.displayName, role: user.role, branchId: user.branchId, totalXp: level.totalXp, level: level.level, currentLevelXp: level.currentLevelXp, nextLevelXp: level.nextLevelXp, progressPercent: level.progressPercent, currentStreak: stats?.currentStreak ?? 0, longestStreak: stats?.longestStreak ?? 0, lastActiveDate: stats?.lastActiveDate ?? "" };
  }

  async activities(filters: ActivityFilters): Promise<UserActivity[]> { return this.repository.listActivities(filters); }

  async teamStats(branchId?: string) {
    const [users, statsRows] = await Promise.all([this.repository.listUsers(), this.repository.listUserStats()]);
    const statsByUser = new Map(statsRows.map((value) => [value.userId, value]));
    return users.filter((user) => user.isActive && (!branchId || user.branchId === branchId)).map((user) => {
      const stats = statsByUser.get(user.userId);
      const level = calculateLevel(stats?.totalXp ?? 0);
      return { userId: user.userId, displayName: user.displayName, role: user.role, branchId: user.branchId, totalXp: level.totalXp, level: level.level, currentLevelXp: level.currentLevelXp, nextLevelXp: level.nextLevelXp, progressPercent: level.progressPercent, currentStreak: stats?.currentStreak ?? 0, longestStreak: stats?.longestStreak ?? 0, lastActiveDate: stats?.lastActiveDate ?? "" };
    }).sort((a, b) => b.totalXp - a.totalXp || a.displayName.localeCompare(b.displayName));
  }

  private async refreshUserStats(activity: UserActivity, receivedXp: boolean): Promise<void> {
    const [existing, transactions] = await Promise.all([
      this.repository.getUserStats(activity.userId),
      this.repository.listXpTransactions(activity.userId),
    ]);
    const transactionTotal = transactions.reduce((sum, value) => sum + value.xpAmount, 0);
    const totalXp = Math.max(existing?.totalXp ?? 0, transactionTotal);
    const level = calculateLevel(totalXp);
    const streak = nextStreak(existing, activity.activityDate);
    const latestXpAt = transactions.reduce((latest, value) => value.createdAt > latest ? value.createdAt : latest, existing?.lastXpAt ?? "");
    await this.repository.upsertUserStats({
      userId: activity.userId,
      totalXp,
      currentLevel: Math.max(existing?.currentLevel ?? 1, level.level),
      currentLevelXp: level.currentLevelXp,
      nextLevelXp: level.nextLevelXp,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      lastActiveDate: activity.activityDate,
      lastXpAt: receivedXp ? activity.createdAt : latestXpAt,
      updatedAt: this.now().toISOString(),
    });
  }
}

export function bangkokDate(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: BANGKOK_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function safeMetadataJson(metadata: unknown): string {
  if (metadata === undefined) return "";
  try { return JSON.stringify(metadata) ?? ""; }
  catch { return JSON.stringify({ error: "METADATA_SERIALIZATION_FAILED" }); }
}

function nextStreak(existing: UserStats | undefined, activityDate: string): { current: number; longest: number } {
  if (existing?.lastActiveDate === activityDate) return { current: existing.currentStreak, longest: existing.longestStreak };
  const current = existing?.lastActiveDate && dayDifference(existing.lastActiveDate, activityDate) === 1 ? existing.currentStreak + 1 : 1;
  return { current, longest: Math.max(existing?.longestStreak ?? 0, current) };
}

function dayDifference(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
