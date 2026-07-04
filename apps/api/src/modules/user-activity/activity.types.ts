export const ACTIVITY_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "REQUEST_CREATED",
  "REQUEST_APPROVED",
  "REQUEST_REJECTED",
  "REQUEST_FULFILLED",
  "STOCK_RECEIVED",
  "STOCK_TRANSFERRED",
  "STOCK_ADJUSTED",
  "STOCK_COUNT_STARTED",
  "STOCK_COUNT_COMPLETED",
  "STOCK_COUNT_REVIEWED",
  "ITEM_CREATED",
  "ITEM_UPDATED",
  "LOCATION_CREATED",
  "LOCATION_UPDATED",
] as const;

export const ACTIVITY_ENTITY_TYPES = ["USER", "REQUEST", "MOVEMENT", "STOCK_COUNT", "ITEM", "LOCATION", "BRANCH", "STORE_ITEM"] as const;
export const ACTIVITY_RESULTS = ["SUCCESS", "FAILED", "PENDING"] as const;

export type ActivityAction = typeof ACTIVITY_ACTIONS[number];
export type ActivityEntityType = typeof ACTIVITY_ENTITY_TYPES[number];
export type ActivityResult = typeof ACTIVITY_RESULTS[number];

export interface CreateActivityInput {
  userId: string;
  branchId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  result: ActivityResult;
  detail?: string;
  metadata?: unknown;
}

export interface UserActivity {
  activityId: string;
  activityDate: string;
  userId: string;
  branchId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  result: ActivityResult;
  detail: string;
  metadataJson: string;
  createdAt: string;
}

export interface UserStats {
  userId: string;
  totalXp: number;
  currentLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  lastXpAt: string;
  updatedAt: string;
}

export interface CreateXpTransactionInput {
  userId: string;
  activityId: string;
  xpAmount: number;
  reason: string;
  entityType: ActivityEntityType;
  entityId: string;
}

export interface XpTransaction extends CreateXpTransactionInput {
  xpTransactionId: string;
  createdAt: string;
}

export interface ActivityListOptions {
  limit?: number;
}
