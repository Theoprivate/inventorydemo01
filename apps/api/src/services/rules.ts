import argon2 from "argon2";
import type { MovementType, Role, StockBalance, StockMovement } from "../models.js";
import { AppError } from "../errors.js";

export async function verifyUserPassword(stored: string, supplied: string): Promise<boolean> {
  if (!stored.startsWith("$argon2")) return false;
  try { return await argon2.verify(stored, supplied); } catch { return false; }
}

const permissions = {
  owner: ["master", "inventory", "request", "approve", "count", "rebuild"],
  manager: ["master", "inventory", "request", "approve", "count"],
  stock: ["inventory", "request", "approve", "count"],
  staff: ["request"],
} satisfies Record<Role, string[]>;
export function roleCan(role: Role, permission: string): boolean { return permissions[role]?.includes(permission) ?? false; }

export function validateMovement(input: { movementType: MovementType; fromLocationId?: string; toLocationId?: string; qty: number }): void {
  if (!Number.isFinite(input.qty) || input.qty <= 0) throw new AppError(400, "INVALID_QTY", "จำนวนต้องมากกว่า 0");
  if (["ISSUE", "WASTE"].includes(input.movementType) && !input.fromLocationId) throw new AppError(400, "FROM_LOCATION_REQUIRED", "กรุณาเลือกตำแหน่งต้นทาง");
  if (["RECEIVE", "RETURN"].includes(input.movementType) && !input.toLocationId) throw new AppError(400, "TO_LOCATION_REQUIRED", "กรุณาเลือกตำแหน่งปลายทาง");
  if (input.movementType === "TRANSFER" && (!input.fromLocationId || !input.toLocationId || input.fromLocationId === input.toLocationId)) throw new AppError(400, "INVALID_TRANSFER", "ตำแหน่งต้นทางและปลายทางต้องไม่ซ้ำกัน");
  if (input.movementType === "ADJUSTMENT" && !input.fromLocationId && !input.toLocationId) throw new AppError(400, "ADJUSTMENT_DIRECTION_REQUIRED", "กรุณาระบุทิศทางการปรับยอด");
}

export function applyMovementToBalances(balances: StockBalance[], movement: StockMovement): StockBalance[] {
  const now = movement.createdAt;
  const adjust = (locationId: string, delta: number) => {
    const balance = balances.find((v) => v.branchId === movement.branchId && v.locationId === locationId && v.itemId === movement.itemId);
    if (balance) { balance.currentQty += delta; balance.updatedAt = now; }
    else balances.push({ balanceId: `BAL-${movement.branchId}-${locationId}-${movement.itemId}`, branchId: movement.branchId, locationId, itemId: movement.itemId, currentQty: delta, updatedAt: now });
  };
  if (movement.fromLocationId) adjust(movement.fromLocationId, -movement.qty);
  if (movement.toLocationId) adjust(movement.toLocationId, movement.qty);
  return balances;
}

export function requestStatus(items: Array<{ requestedQty: number; approvedQty: number; issuedQty: number }>): "PENDING" | "APPROVED" | "PARTIAL" | "COMPLETED" {
  if (items.length && items.every((v) => v.issuedQty >= v.approvedQty && v.approvedQty > 0)) return "COMPLETED";
  if (items.some((v) => v.issuedQty > 0)) return "PARTIAL";
  if (items.some((v) => v.approvedQty > 0)) return "APPROVED";
  return "PENDING";
}
export const countVariance = (systemQty: number, countedQty: number): number => countedQty - systemQty;
