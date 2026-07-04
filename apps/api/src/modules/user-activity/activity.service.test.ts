import { describe, expect, it } from "vitest";
import type { ActivityRepository } from "./activity.repository.js";
import { ActivityService } from "./activity.service.js";
import type { ActivityListOptions, UserActivity, UserStats, XpTransaction } from "./activity.types.js";
import { generateActivityId, generateXpTransactionId, getBangkokDate, getIsoTimestamp } from "./activity.utils.js";

class MemoryActivityRepository implements ActivityRepository {
  activities: UserActivity[] = [];
  transactions: XpTransaction[] = [];
  stats = new Map<string, UserStats>();

  async appendActivity(activity: UserActivity) { this.activities.push(structuredClone(activity)); }
  async findActivitiesByUser(userId: string, options?: ActivityListOptions) { return this.limit(this.activities.filter((activity) => activity.userId === userId), options); }
  async findActivitiesByBranch(branchId: string, options?: ActivityListOptions) { return this.limit(this.activities.filter((activity) => activity.branchId === branchId), options); }
  async findUserStatsByUserId(userId: string) { const value = this.stats.get(userId); return value ? structuredClone(value) : undefined; }
  async saveUserStats(stats: UserStats) { this.stats.set(stats.userId, structuredClone(stats)); }
  async findXpTransactionByActivityId(activityId: string) { return this.transactions.find((transaction) => transaction.activityId === activityId); }
  async appendXpTransaction(transaction: XpTransaction) { this.transactions.push(structuredClone(transaction)); }

  private limit(values: UserActivity[], options?: ActivityListOptions) {
    return structuredClone(options?.limit === undefined ? values : values.slice(0, options.limit));
  }
}

const activityInput = {
  userId: "U001",
  branchId: "B001",
  action: "REQUEST_CREATED" as const,
  entityType: "REQUEST" as const,
  entityId: "REQ-001",
  result: "SUCCESS" as const,
  detail: "created",
  metadata: { source: "test" },
};

describe("activity utilities", () => {
  it("generates prefixed UUID identifiers", () => {
    expect(generateActivityId()).toMatch(/^ACT-[0-9a-f-]{36}$/i);
    expect(generateXpTransactionId()).toMatch(/^XPT-[0-9a-f-]{36}$/i);
  });

  it("formats Bangkok dates and ISO timestamps", () => {
    const value = new Date("2026-07-03T18:30:00.000Z");
    expect(getBangkokDate(value)).toBe("2026-07-04");
    expect(getIsoTimestamp(value)).toBe("2026-07-03T18:30:00.000Z");
  });
});

describe("ActivityService", () => {
  it("creates an activity without awarding XP or updating user stats", async () => {
    const repository = new MemoryActivityRepository();
    const service = new ActivityService(repository, () => new Date("2026-07-03T18:30:00.000Z"));

    const activity = await service.createActivity(activityInput);

    expect(activity).toMatchObject({
      activityDate: "2026-07-04",
      userId: "U001",
      metadataJson: '{"source":"test"}',
      createdAt: "2026-07-03T18:30:00.000Z",
    });
    expect(activity.activityId).toMatch(/^ACT-[0-9a-f-]{36}$/i);
    expect(repository.activities).toEqual([activity]);
    expect(repository.transactions).toHaveLength(0);
    expect(repository.stats).toHaveLength(0);
  });

  it("creates at most one XP transaction for an Activity_ID", async () => {
    const repository = new MemoryActivityRepository();
    const service = new ActivityService(repository, () => new Date("2026-07-04T00:00:00.000Z"));
    const activity = await service.createActivity(activityInput);
    const input = { userId: "U001", activityId: activity.activityId, xpAmount: 10, reason: "manual phase-1 test", entityType: "REQUEST" as const, entityId: "REQ-001" };

    const first = await service.createXpTransaction(input);
    const second = await service.createXpTransaction(input);

    expect(first.xpTransactionId).toMatch(/^XPT-[0-9a-f-]{36}$/i);
    expect(second).toEqual(first);
    expect(repository.transactions).toHaveLength(1);
  });

  it("validates and saves a complete User_Stats row", async () => {
    const repository = new MemoryActivityRepository();
    const service = new ActivityService(repository);
    const stats: UserStats = {
      userId: "U001",
      totalXp: 5,
      currentLevel: 1,
      currentLevelXp: 5,
      nextLevelXp: 100,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: "2026-07-04",
      lastXpAt: "2026-07-03T18:58:56.102Z",
      updatedAt: "2026-07-03T18:58:58.472Z",
    };

    await service.saveUserStats(stats);

    await expect(service.findUserStatsByUserId("U001")).resolves.toEqual(stats);
  });
});
