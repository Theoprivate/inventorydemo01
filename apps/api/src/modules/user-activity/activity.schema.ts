import { z } from "zod";
import { ACTIVITY_ACTIONS, ACTIVITY_ENTITY_TYPES, ACTIVITY_RESULTS } from "./activity.types.js";

const requiredId = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD");
const dateOrEmpty = z.union([date, z.literal("")]);
const timestamp = z.string().datetime({ offset: true });
const timestampOrEmpty = z.union([timestamp, z.literal("")]);

export const createActivityInputSchema = z.object({
  userId: requiredId,
  branchId: requiredId,
  action: z.enum(ACTIVITY_ACTIONS),
  entityType: z.enum(ACTIVITY_ENTITY_TYPES),
  entityId: requiredId,
  result: z.enum(ACTIVITY_RESULTS),
  detail: z.string().trim().default(""),
  metadata: z.unknown().optional(),
});

export const userActivitySchema = z.object({
  activityId: z.string().regex(/^ACT-[0-9a-f-]{36}$/i),
  activityDate: date,
  userId: requiredId,
  branchId: requiredId,
  action: z.enum(ACTIVITY_ACTIONS),
  entityType: z.enum(ACTIVITY_ENTITY_TYPES),
  entityId: requiredId,
  result: z.enum(ACTIVITY_RESULTS),
  detail: z.string(),
  metadataJson: z.string(),
  createdAt: timestamp,
});

export const userStatsSchema = z.object({
  userId: requiredId,
  totalXp: z.number().int().nonnegative(),
  currentLevel: z.number().int().min(1),
  currentLevelXp: z.number().int().nonnegative(),
  nextLevelXp: z.number().int().nonnegative(),
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
  lastActiveDate: dateOrEmpty,
  lastXpAt: timestampOrEmpty,
  updatedAt: timestamp,
});

export const createXpTransactionInputSchema = z.object({
  userId: requiredId,
  activityId: z.string().regex(/^ACT-[0-9a-f-]{36}$/i),
  xpAmount: z.number().int(),
  reason: z.string().trim().min(1),
  entityType: z.enum(ACTIVITY_ENTITY_TYPES),
  entityId: requiredId,
});

export const xpTransactionSchema = createXpTransactionInputSchema.extend({
  xpTransactionId: z.string().regex(/^XPT-[0-9a-f-]{36}$/i),
  createdAt: timestamp,
});
