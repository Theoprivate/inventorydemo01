import { randomUUID } from "node:crypto";

export function createId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function balanceId(branchId: string, locationId: string, itemId: string): string {
  return `BAL-${branchId}-${locationId}-${itemId}`;
}
