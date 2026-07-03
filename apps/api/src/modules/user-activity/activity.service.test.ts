import { describe, expect, it } from "vitest";
import type { ActivityRepository } from "./activity.repository.js";
import { ActivityService } from "./activity.service.js";
import type { ActivityFilters, ActivityUser, UserActivity, UserStats, XpTransaction } from "./activity.types.js";

class MemoryActivityRepository implements ActivityRepository {
  activities: UserActivity[] = [];
  transactions: XpTransaction[] = [];
  stats = new Map<string, UserStats>();
  users: ActivityUser[] = [];
  async appendActivity(value: UserActivity) { this.activities.push(structuredClone(value)); }
  async listActivities(filters: ActivityFilters) { return this.activities.filter((value) => (!filters.userId || value.userId === filters.userId) && (!filters.branchId || value.branchId === filters.branchId) && (!filters.action || value.action === filters.action) && (!filters.dateFrom || value.activityDate >= filters.dateFrom) && (!filters.dateTo || value.activityDate <= filters.dateTo)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, filters.limit); }
  async appendXpTransaction(value: XpTransaction) { this.transactions.push(structuredClone(value)); }
  async listXpTransactions(userId?: string) { return this.transactions.filter((value) => !userId || value.userId === userId).map((value) => structuredClone(value)); }
  async getUserStats(userId: string) { const value = this.stats.get(userId); return value ? structuredClone(value) : undefined; }
  async listUserStats() { return [...this.stats.values()].map((value) => structuredClone(value)); }
  async upsertUserStats(value: UserStats) { this.stats.set(value.userId, structuredClone(value)); }
  async listUsers() { return structuredClone(this.users); }
}

const input = (action: "LOGIN_SUCCESS" | "REQUEST_CREATED" | "REQUEST_REJECTED") => ({ userId: "U1", branchId: "B1", action, entityType: action.startsWith("LOGIN") ? "USER" as const : "REQUEST" as const, entityId: action.startsWith("LOGIN") ? "U1" : "REQ-1", result: "SUCCESS" as const });

describe("ActivityService", () => {
  it("does not create XP for an action without a rule", async () => {
    const repository = new MemoryActivityRepository();
    const service = new ActivityService(repository);
    const result = await service.recordActivity(input("REQUEST_REJECTED"));
    expect(result.xpAwarded).toBe(0);
    expect(repository.transactions).toHaveLength(0);
  });

  it("does not reward the same Activity_ID twice", async () => {
    const repository = new MemoryActivityRepository();
    const service = new ActivityService(repository);
    const first = await service.recordActivity(input("REQUEST_CREATED"));
    const second = await service.awardXpForActivity(first.activity);
    expect(second).toEqual({ xpAwarded: 0, alreadyRewarded: true });
    expect(repository.transactions).toHaveLength(1);
    expect(repository.stats.get("U1")?.totalXp).toBe(10);
  });

  it("rewards LOGIN_SUCCESS only once on the same Bangkok date", async () => {
    const repository = new MemoryActivityRepository();
    let current = new Date("2026-07-03T01:00:00.000Z");
    const service = new ActivityService(repository, { now: () => current });
    const first = await service.recordActivity(input("LOGIN_SUCCESS"));
    current = new Date("2026-07-03T12:00:00.000Z");
    const second = await service.recordActivity(input("LOGIN_SUCCESS"));
    expect(first.xpAwarded).toBe(5);
    expect(second).toMatchObject({ xpAwarded: 0, alreadyRewarded: true });
    expect(repository.transactions).toHaveLength(1);
  });

  it("rewards LOGIN_SUCCESS again on a different Bangkok date", async () => {
    const repository = new MemoryActivityRepository();
    let current = new Date("2026-07-03T01:00:00.000Z");
    const service = new ActivityService(repository, { now: () => current });
    await service.recordActivity(input("LOGIN_SUCCESS"));
    current = new Date("2026-07-04T01:00:00.000Z");
    const second = await service.recordActivity(input("LOGIN_SUCCESS"));
    expect(second.xpAwarded).toBe(5);
    expect(repository.transactions).toHaveLength(2);
  });

  it("increments streak on consecutive active dates", async () => {
    const repository = new MemoryActivityRepository();
    let current = new Date("2026-07-03T01:00:00.000Z");
    const service = new ActivityService(repository, { now: () => current });
    await service.recordActivity(input("REQUEST_REJECTED"));
    current = new Date("2026-07-04T01:00:00.000Z");
    await service.recordActivity({ ...input("REQUEST_REJECTED"), entityId: "REQ-2" });
    expect(repository.stats.get("U1")).toMatchObject({ currentStreak: 2, longestStreak: 2, lastActiveDate: "2026-07-04" });
  });

  it("resets streak after a skipped active date", async () => {
    const repository = new MemoryActivityRepository();
    let current = new Date("2026-07-03T01:00:00.000Z");
    const service = new ActivityService(repository, { now: () => current });
    await service.recordActivity(input("REQUEST_REJECTED"));
    current = new Date("2026-07-05T01:00:00.000Z");
    await service.recordActivity({ ...input("REQUEST_REJECTED"), entityId: "REQ-3" });
    expect(repository.stats.get("U1")).toMatchObject({ currentStreak: 1, longestStreak: 1, lastActiveDate: "2026-07-05" });
  });
});
