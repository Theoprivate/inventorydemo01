import type { ActivityAction } from "./activity.types.js";

export const XP_RULES = {
  LOGIN_SUCCESS: 5,
  REQUEST_CREATED: 10,
  REQUEST_APPROVED: 10,
  REQUEST_FULFILLED: 15,
  STOCK_RECEIVED: 15,
  STOCK_TRANSFERRED: 15,
  STOCK_COUNT_COMPLETED: 20,
  STOCK_COUNT_REVIEWED: 10,
} as const satisfies Partial<Record<ActivityAction, number>>;

export function xpForAction(action: ActivityAction): number {
  return XP_RULES[action as keyof typeof XP_RULES] ?? 0;
}
