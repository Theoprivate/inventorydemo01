import { createActivityInputSchema, createXpTransactionInputSchema, userStatsSchema } from "./activity.schema.js";
import type { ActivityRepository } from "./activity.repository.js";
import type { ActivityListOptions, CreateActivityInput, CreateXpTransactionInput, UserActivity, UserStats, XpTransaction } from "./activity.types.js";
import { generateActivityId, generateXpTransactionId, getBangkokDate, getIsoTimestamp } from "./activity.utils.js";

export class ActivityService {
  constructor(private readonly repository: ActivityRepository, private readonly now: () => Date = () => new Date()) {}

  async createActivity(input: CreateActivityInput): Promise<UserActivity> {
    const parsed = createActivityInputSchema.parse(input);
    const timestamp = this.now();
    const activity: UserActivity = {
      activityId: generateActivityId(),
      activityDate: getBangkokDate(timestamp),
      userId: parsed.userId,
      branchId: parsed.branchId,
      action: parsed.action,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      result: parsed.result,
      detail: parsed.detail,
      metadataJson: serializeMetadata(parsed.metadata),
      createdAt: getIsoTimestamp(timestamp),
    };
    await this.repository.appendActivity(activity);
    return activity;
  }

  findActivitiesByUser(userId: string, options?: ActivityListOptions): Promise<UserActivity[]> {
    return this.repository.findActivitiesByUser(userId, options);
  }

  findActivitiesByBranch(branchId: string, options?: ActivityListOptions): Promise<UserActivity[]> {
    return this.repository.findActivitiesByBranch(branchId, options);
  }

  findUserStatsByUserId(userId: string): Promise<UserStats | undefined> {
    return this.repository.findUserStatsByUserId(userId);
  }

  async saveUserStats(stats: UserStats): Promise<UserStats> {
    const parsed = userStatsSchema.parse(stats);
    await this.repository.saveUserStats(parsed);
    return parsed;
  }

  async createXpTransaction(input: CreateXpTransactionInput): Promise<XpTransaction> {
    const parsed = createXpTransactionInputSchema.parse(input);
    const existing = await this.repository.findXpTransactionByActivityId(parsed.activityId);
    if (existing) return existing;
    const transaction: XpTransaction = {
      ...parsed,
      xpTransactionId: generateXpTransactionId(),
      createdAt: getIsoTimestamp(this.now()),
    };
    await this.repository.appendXpTransaction(transaction);
    return transaction;
  }
}

function serializeMetadata(metadata: unknown): string {
  if (metadata === undefined) return "";
  try {
    return JSON.stringify(metadata) ?? "";
  } catch {
    return JSON.stringify({ error: "METADATA_SERIALIZATION_FAILED" });
  }
}
