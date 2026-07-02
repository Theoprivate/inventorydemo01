import { describe, expect, it } from "vitest";
import type { StockBalance, StockMovement } from "../models.js";
import { applyMovementToBalances, countVariance, requestStatus, roleCan, validateMovement, verifyUserPassword } from "./rules.js";

describe("password verifier", () => {
  it("supports legacy plain text without exposing it", async () => {
    expect(await verifyUserPassword("demo-secret", "demo-secret")).toBe(true);
    expect(await verifyUserPassword("demo-secret", "wrong")).toBe(false);
  });
});

describe("stock rules", () => {
  const movement = (overrides: Partial<StockMovement> = {}): StockMovement => ({ movementId: "MOV-1", movementDate: "2026-01-01", branchId: "B1", itemId: "I1", movementType: "TRANSFER", fromLocationId: "L1", toLocationId: "L2", qty: 3, unit: "kg", referenceType: "MANUAL", referenceId: "MOV-1", createdBy: "U1", note: "", createdAt: "2026-01-01T00:00:00Z", ...overrides });
  it("validates transfer locations and positive qty", () => { expect(() => validateMovement({ movementType: "TRANSFER", fromLocationId: "L1", toLocationId: "L1", qty: 1 })).toThrow(); expect(() => validateMovement({ movementType: "RECEIVE", toLocationId: "L1", qty: 1 })).not.toThrow(); });
  it("calculates transfer balances", () => { const balances: StockBalance[] = [{ balanceId: "BAL-B1-L1-I1", branchId: "B1", locationId: "L1", itemId: "I1", currentQty: 10, updatedAt: "" }]; const result = applyMovementToBalances(balances, movement()); expect(result.find((v) => v.locationId === "L1")?.currentQty).toBe(7); expect(result.find((v) => v.locationId === "L2")?.currentQty).toBe(3); });
  it("calculates request progress", () => { expect(requestStatus([{ requestedQty: 5, approvedQty: 5, issuedQty: 2 }])).toBe("PARTIAL"); expect(requestStatus([{ requestedQty: 5, approvedQty: 5, issuedQty: 5 }])).toBe("COMPLETED"); });
  it("calculates count variance", () => expect(countVariance(10, 8)).toBe(-2));
  it("enforces role permissions", () => { expect(roleCan("owner", "rebuild")).toBe(true); expect(roleCan("staff", "approve")).toBe(false); });
});
