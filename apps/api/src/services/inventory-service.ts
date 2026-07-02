import { AppError } from "../errors.js";
import type { DashboardSummary, Item, Location, RequestDetail, SessionUser, SheetRecord, StockBalance, StockCount, StockCountItem, StockMovement, StockRequest, StockRequestItem, StoreItem } from "../models.js";
import type { InventoryRepository } from "../repositories/inventory-repository.js";
import { balanceRecord, countItemRecord, countRecord, itemRecord, locationRecord, mapBalance, mapBranch, mapCategory, mapCount, mapCountItem, mapItem, mapLocation, mapMovement, mapRequest, mapRequestItem, mapStoreItem, mapUser, movementRecord, requestItemRecord, requestRecord, storeItemRecord } from "../utils/mappers.js";
import { balanceId, createId } from "../utils/ids.js";
import { applyMovementToBalances, countVariance, requestStatus, validateMovement, verifyUserPassword } from "./rules.js";

const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  async login(username: string, password: string): Promise<SessionUser | null> {
    const users = (await this.repository.read("Users", { fresh: true })).map(mapUser);
    const user = users.find((candidate) => candidate.username === username && candidate.isActive);
    if (!user || !(await verifyUserPassword(user.password, password))) return null;
    const branch = (await this.branches()).find((v) => v.branchId === user.branchId && v.isActive);
    if (!branch) throw new AppError(403, "BRANCH_INACTIVE", "สาขาของผู้ใช้ไม่ได้เปิดใช้งาน");
    return { userId: user.userId, username: user.username, displayName: user.displayName, role: user.role, branchId: user.branchId, branchName: branch.branchName };
  }

  async branches() { return (await this.repository.read("Branches")).map(mapBranch); }
  async categories() { return (await this.repository.read("Categories")).map(mapCategory).sort((a, b) => a.sortOrder - b.sortOrder); }
  async items() { return (await this.repository.read("Items")).map(mapItem); }
  async locations(branchId?: string) { const values = (await this.repository.read("Locations")).map(mapLocation); return branchId ? values.filter((v) => v.branchId === branchId) : values; }
  async storeItems(branchId: string) { return (await this.repository.read("Store_Items")).map(mapStoreItem).filter((v) => v.branchId === branchId); }
  async balances(branchId: string) { return (await this.repository.read("Stock_Balances", { fresh: true })).map(mapBalance).filter((v) => v.branchId === branchId); }

  async saveItem(input: Partial<Item> & Pick<Item, "itemName" | "categoryId" | "unit">): Promise<Item> {
    const existing = input.itemId ? (await this.items()).find((v) => v.itemId === input.itemId) : undefined;
    const value: Item = { itemId: existing?.itemId ?? createId("I"), itemName: input.itemName.trim(), categoryId: input.categoryId, unit: input.unit.trim(), imageUrl: input.imageUrl?.trim() ?? existing?.imageUrl ?? "", description: input.description?.trim() ?? existing?.description ?? "", isActive: input.isActive ?? existing?.isActive ?? true, createdAt: existing?.createdAt ?? now() };
    await this.repository.upsert("Items", "Item_ID", [itemRecord(value)]);
    return value;
  }

  async saveLocation(user: SessionUser, input: Partial<Location> & Pick<Location, "locationName" | "locationType">): Promise<Location> {
    const branchId = user.role === "owner" && input.branchId ? input.branchId : user.branchId;
    const existing = input.locationId ? (await this.locations(branchId)).find((v) => v.locationId === input.locationId) : undefined;
    const value: Location = { locationId: existing?.locationId ?? createId("L"), locationName: input.locationName.trim(), branchId, locationType: input.locationType, isActive: input.isActive ?? existing?.isActive ?? true };
    await this.repository.upsert("Locations", "Location_ID", [locationRecord(value)]);
    return value;
  }

  async saveStoreItems(user: SessionUser, branchId: string, inputs: Array<Partial<StoreItem> & Pick<StoreItem, "itemId">>): Promise<StoreItem[]> {
    if (user.role !== "owner" && branchId !== user.branchId) throw new AppError(403, "BRANCH_FORBIDDEN", "ไม่สามารถแก้ข้อมูลต่างสาขาได้");
    const existing = await this.storeItems(branchId);
    const values = inputs.map((input) => {
      const current = existing.find((v) => v.itemId === input.itemId);
      return { storeItemId: current?.storeItemId ?? createId("SI"), branchId, itemId: input.itemId, minQty: input.minQty ?? current?.minQty ?? 0, targetQty: input.targetQty ?? current?.targetQty ?? 0, defaultLocationId: input.defaultLocationId ?? current?.defaultLocationId ?? "", allowRequest: input.allowRequest ?? current?.allowRequest ?? true, requireDailyCount: input.requireDailyCount ?? current?.requireDailyCount ?? false, isActive: input.isActive ?? current?.isActive ?? true } satisfies StoreItem;
    });
    await this.repository.upsert("Store_Items", "Store_Item_ID", values.map(storeItemRecord));
    return values;
  }

  async dashboard(user: SessionUser): Promise<DashboardSummary> {
    const [requests, storeItems, balances] = await Promise.all([this.requests(user), this.storeItems(user.branchId), this.balances(user.branchId)]);
    const totals = new Map<string, number>();
    for (const balance of balances) totals.set(balance.itemId, (totals.get(balance.itemId) ?? 0) + balance.currentQty);
    return { pendingRequests: requests.filter((v) => ["PENDING", "APPROVED", "PARTIAL"].includes(v.requestStatus)).length, lowStockItems: storeItems.filter((v) => v.isActive && (totals.get(v.itemId) ?? 0) < v.minQty).length, dailyCountItems: storeItems.filter((v) => v.isActive && v.requireDailyCount).length };
  }

  async requestableItems(user: SessionUser) {
    const [items, categories, storeItems, balances] = await Promise.all([this.items(), this.categories(), this.storeItems(user.branchId), this.balances(user.branchId)]);
    const totals = new Map<string, number>(); for (const b of balances) totals.set(b.itemId, (totals.get(b.itemId) ?? 0) + b.currentQty);
    return storeItems.filter((s) => s.isActive && s.allowRequest).flatMap((s) => { const item = items.find((v) => v.itemId === s.itemId && v.isActive); if (!item) return []; return [{ ...item, storeItem: s, category: categories.find((v) => v.categoryId === item.categoryId), totalQty: totals.get(item.itemId) ?? 0 }]; });
  }

  async createRequest(user: SessionUser, input: { note?: string; items: Array<{ itemId: string; requestedQty: number; unit: string; note?: string }> }, idempotencyKey?: string): Promise<{ requestId: string; status: "PENDING"; itemCount: number }> {
    if (!input.items.length) throw new AppError(400, "EMPTY_REQUEST", "กรุณาเลือกสินค้าอย่างน้อยหนึ่งรายการ");
    const allowed = await this.requestableItems(user);
    const merged = new Map<string, { itemId: string; requestedQty: number; unit: string; note?: string }>();
    for (const item of input.items) {
      const current = merged.get(item.itemId);
      if (current) {
        current.requestedQty += item.requestedQty;
        if (item.note?.trim() && item.note.trim() !== current.note?.trim()) current.note = [current.note?.trim(), item.note.trim()].filter(Boolean).join("; ");
      } else merged.set(item.itemId, { ...item });
    }
    const requestId = idempotencyKey ? `REQ-${idempotencyKey}` : createId("REQ");
    const request: StockRequest = { requestId, requestDate: today(), branchId: user.branchId, requestedBy: user.userId, requestStatus: "PENDING", approvedBy: "", completedAt: "", note: input.note?.trim() ?? "", createdAt: now() };
    const requestItems: StockRequestItem[] = [...merged.values()].map((v) => { const found = allowed.find((x) => x.itemId === v.itemId); if (!found || v.requestedQty <= 0 || v.unit.trim() !== found.unit) throw new AppError(400, "INVALID_REQUEST_ITEM", `สินค้า ${v.itemId} หรือหน่วยสินค้าไม่ถูกต้อง`); return { requestItemId: createId("REQI"), requestId, itemId: v.itemId, requestedQty: v.requestedQty, approvedQty: 0, issuedQty: 0, unit: found.unit, itemStatus: "PENDING", note: v.note?.trim() ?? "" }; });
    const created = await this.repository.createStockRequest(requestRecord(request), requestItems.map(requestItemRecord));
    if (!created) {
      const existing = (await this.repository.read("Stock_Requests", { fresh: true })).map(mapRequest).find((value) => value.requestId === requestId);
      if (!existing || existing.branchId !== user.branchId || existing.requestedBy !== user.userId) throw new AppError(409, "DUPLICATE_REQUEST_ID", "Request_ID นี้ถูกใช้งานแล้ว");
    }
    return { requestId, status: "PENDING", itemCount: requestItems.length };
  }

  async requests(user: SessionUser, statuses?: string[]): Promise<Array<StockRequest & { itemCount: number; requestedTotal: number; issuedTotal: number }>> {
    let values = (await this.repository.read("Stock_Requests", { fresh: true })).map(mapRequest).filter((v) => v.branchId === user.branchId);
    if (user.role === "staff") values = values.filter((v) => v.requestedBy === user.userId);
    if (statuses?.length) values = values.filter((v) => statuses.includes(v.requestStatus));
    const requestItems = (await this.repository.read("Stock_Request_Items", { fresh: true })).map(mapRequestItem);
    return values.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((request) => {
      const items = requestItems.filter((item) => item.requestId === request.requestId);
      return { ...request, itemCount: items.length, requestedTotal: items.reduce((sum, item) => sum + item.requestedQty, 0), issuedTotal: items.reduce((sum, item) => sum + item.issuedQty, 0) };
    });
  }

  async requestDetail(user: SessionUser, requestId: string): Promise<RequestDetail> {
    const request = (await this.repository.read("Stock_Requests", { fresh: true })).map(mapRequest).find((v) => v.requestId === requestId);
    if (!request || request.branchId !== user.branchId || (user.role === "staff" && request.requestedBy !== user.userId)) throw new AppError(404, "REQUEST_NOT_FOUND", "ไม่พบคำขอ");
    const [rows, items, users] = await Promise.all([this.repository.read("Stock_Request_Items", { fresh: true }), this.items(), this.repository.read("Users")]);
    return { ...request, items: rows.map(mapRequestItem).filter((v) => v.requestId === requestId).map((v) => ({ ...v, item: items.find((i) => i.itemId === v.itemId) })), requester: users.map(mapUser).filter((v) => v.userId === request.requestedBy).map((v) => ({ userId: v.userId, displayName: v.displayName, username: v.username }))[0] };
  }

  async cancelRequest(user: SessionUser, requestId: string): Promise<StockRequest> { const detail = await this.requestDetail(user, requestId); if (detail.requestStatus !== "PENDING") throw new AppError(409, "REQUEST_NOT_PENDING", "ยกเลิกได้เฉพาะคำขอที่รอดำเนินการ"); const value = { ...detail, requestStatus: "CANCELLED" as const }; await this.repository.upsert("Stock_Requests", "Request_ID", [requestRecord(value)]); return value; }
  async rejectRequest(user: SessionUser, requestId: string): Promise<StockRequest> { const detail = await this.requestDetail(user, requestId); const value = { ...detail, requestStatus: "REJECTED" as const, approvedBy: user.userId, completedAt: now() }; await this.repository.upsert("Stock_Requests", "Request_ID", [requestRecord(value)]); return value; }

  async approveRequest(user: SessionUser, requestId: string, approvals: Array<{ requestItemId: string; approvedQty: number }>): Promise<RequestDetail> {
    const detail = await this.requestDetail(user, requestId);
    const items = detail.items.map((item) => { const approval = approvals.find((v) => v.requestItemId === item.requestItemId); const qty = approval?.approvedQty ?? item.requestedQty; if (qty < 0 || qty > item.requestedQty) throw new AppError(400, "INVALID_APPROVED_QTY", "ยอดอนุมัติต้องไม่เกินยอดที่ขอ"); return { ...item, approvedQty: qty, itemStatus: qty > 0 ? "APPROVED" : "REJECTED" }; });
    const request: StockRequest = { ...detail, requestStatus: "APPROVED", approvedBy: user.userId };
    await this.repository.upsert("Stock_Request_Items", "Request_Item_ID", items.map(requestItemRecord));
    await this.repository.upsert("Stock_Requests", "Request_ID", [requestRecord(request)]);
    return { ...request, items };
  }

  async issueRequest(user: SessionUser, requestId: string, issues: Array<{ requestItemId: string; qty: number; fromLocationId?: string; toLocationId?: string }>): Promise<RequestDetail> {
    const detail = await this.requestDetail(user, requestId);
    const locations = await this.locations(user.branchId);
    const warehouse = locations.find((v) => v.isActive && v.locationType === "WAREHOUSE");
    const storeItems = await this.storeItems(user.branchId);
    const balances = await this.balances(user.branchId);
    const movements: StockMovement[] = [];
    const updatedItems = detail.items.map((item) => {
      const issue = issues.find((v) => v.requestItemId === item.requestItemId); if (!issue || issue.qty === 0) return item;
      const approvedQty = item.approvedQty || item.requestedQty;
      if (issue.qty < 0 || item.issuedQty + issue.qty > approvedQty) throw new AppError(400, "ISSUE_EXCEEDS_APPROVAL", "ยอดจ่ายเกินยอดอนุมัติ");
      const from = issue.fromLocationId || warehouse?.locationId || "";
      const to = issue.toLocationId || storeItems.find((v) => v.itemId === item.itemId)?.defaultLocationId || "";
      if (!from || !to) throw new AppError(400, "LOCATION_REQUIRED", "กรุณาระบุตำแหน่งต้นทางและปลายทาง");
      const available = balances.find((v) => v.itemId === item.itemId && v.locationId === from)?.currentQty ?? 0;
      if (available < issue.qty) throw new AppError(409, "INSUFFICIENT_STOCK", `สต๊อก ${item.item?.itemName ?? item.itemId} ไม่พอ`);
      const movement: StockMovement = { movementId: createId("MOV"), movementDate: today(), branchId: user.branchId, itemId: item.itemId, movementType: "TRANSFER", fromLocationId: from, toLocationId: to, qty: issue.qty, unit: item.unit, referenceType: "REQUEST", referenceId: requestId, createdBy: user.userId, note: "จ่ายตามคำขอ", createdAt: now() };
      applyMovementToBalances(balances, movement); movements.push(movement);
      return { ...item, approvedQty, issuedQty: item.issuedQty + issue.qty, itemStatus: item.issuedQty + issue.qty >= approvedQty ? "COMPLETED" : "PARTIAL" };
    });
    if (!movements.length) throw new AppError(400, "NOTHING_TO_ISSUE", "ไม่มีรายการที่ต้องจ่าย");
    const status = requestStatus(updatedItems);
    const request: StockRequest = { ...detail, requestStatus: status, approvedBy: detail.approvedBy || user.userId, completedAt: status === "COMPLETED" ? now() : "" };
    await this.repository.append("Stock_Movements", movements.map(movementRecord));
    await this.repository.upsert("Stock_Balances", "Balance_ID", balances.map(balanceRecord));
    await this.repository.upsert("Stock_Request_Items", "Request_Item_ID", updatedItems.map(requestItemRecord));
    await this.repository.upsert("Stock_Requests", "Request_ID", [requestRecord(request)]);
    return { ...request, items: updatedItems };
  }

  async quickIssueRequest(user: SessionUser, requestId: string): Promise<RequestDetail> {
    let detail = await this.requestDetail(user, requestId);
    if (detail.requestStatus === "PENDING") {
      detail = await this.approveRequest(user, requestId, detail.items.map((item) => ({ requestItemId: item.requestItemId, approvedQty: item.requestedQty })));
    }
    if (!["APPROVED", "PARTIAL"].includes(detail.requestStatus)) throw new AppError(409, "REQUEST_NOT_ISSUABLE", "คำขอนี้ไม่สามารถจ่ายแบบด่วนได้");
    return this.issueRequest(user, requestId, detail.items.map((item) => ({ requestItemId: item.requestItemId, qty: Math.max(0, (item.approvedQty || item.requestedQty) - item.issuedQty) })));
  }

  async createMovement(user: SessionUser, input: { movementId?: string; itemId: string; movementType: StockMovement["movementType"]; fromLocationId?: string; toLocationId?: string; qty: number; unit: string; note?: string; adjustmentDirection?: "increase" | "decrease"; overrideNegative?: boolean }): Promise<StockMovement> {
    let from = input.fromLocationId ?? ""; let to = input.toLocationId ?? "";
    if (input.movementType === "ADJUSTMENT") { if (input.adjustmentDirection === "increase") from = ""; else if (input.adjustmentDirection === "decrease") to = ""; }
    validateMovement({ movementType: input.movementType, fromLocationId: from, toLocationId: to, qty: input.qty });
    const movementId = input.movementId ?? createId("MOV");
    const existing = (await this.repository.read("Stock_Movements", { fresh: true })).map(mapMovement).find((v) => v.movementId === movementId);
    if (existing) return existing;
    const balances = await this.balances(user.branchId);
    if (from) { const available = balances.find((v) => v.itemId === input.itemId && v.locationId === from)?.currentQty ?? 0; if (available < input.qty && !(user.role === "owner" && input.overrideNegative && input.note?.trim())) throw new AppError(409, "INSUFFICIENT_STOCK", "สต๊อกไม่พอสำหรับรายการนี้"); }
    const movement: StockMovement = { movementId, movementDate: today(), branchId: user.branchId, itemId: input.itemId, movementType: input.movementType, fromLocationId: from, toLocationId: to, qty: input.qty, unit: input.unit, referenceType: "MANUAL", referenceId: movementId, createdBy: user.userId, note: input.note?.trim() ?? "", createdAt: now() };
    applyMovementToBalances(balances, movement);
    await this.repository.append("Stock_Movements", [movementRecord(movement)]);
    await this.repository.upsert("Stock_Balances", "Balance_ID", balances.map(balanceRecord));
    return movement;
  }

  async movements(user: SessionUser) { return (await this.repository.read("Stock_Movements", { fresh: true })).map(mapMovement).filter((v) => v.branchId === user.branchId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }

  async createCount(user: SessionUser, input: { locationId: string; countRound: string; status: "DRAFT" | "COMPLETED"; note?: string; items: Array<{ itemId: string; countedQty: number; unit: string; note?: string }> }) {
    const balances = await this.balances(user.branchId); const countId = createId("CNT");
    const count: StockCount = { countId, countDate: today(), branchId: user.branchId, locationId: input.locationId, countRound: input.countRound, countedBy: user.userId, countStatus: input.status, note: input.note?.trim() ?? "", createdAt: now() };
    const items: StockCountItem[] = input.items.map((v) => { const systemQty = balances.find((b) => b.locationId === input.locationId && b.itemId === v.itemId)?.currentQty ?? 0; return { countItemId: createId("CNTI"), countId, itemId: v.itemId, systemQty, countedQty: v.countedQty, varianceQty: countVariance(systemQty, v.countedQty), unit: v.unit, note: v.note?.trim() ?? "" }; });
    await this.repository.append("Stock_Counts", [countRecord(count)]); await this.repository.append("Stock_Count_Items", items.map(countItemRecord));
    if (input.status === "COMPLETED") {
      const movements = items.filter((v) => v.varianceQty !== 0).map((v): StockMovement => ({ movementId: createId("MOV"), movementDate: today(), branchId: user.branchId, itemId: v.itemId, movementType: "ADJUSTMENT", fromLocationId: v.varianceQty < 0 ? input.locationId : "", toLocationId: v.varianceQty > 0 ? input.locationId : "", qty: Math.abs(v.varianceQty), unit: v.unit, referenceType: "COUNT", referenceId: countId, createdBy: user.userId, note: "ปรับยอดจากการนับสต๊อก", createdAt: now() }));
      for (const movement of movements) applyMovementToBalances(balances, movement);
      if (movements.length) { await this.repository.append("Stock_Movements", movements.map(movementRecord)); await this.repository.upsert("Stock_Balances", "Balance_ID", balances.map(balanceRecord)); }
    }
    return { ...count, items };
  }

  async counts(user: SessionUser) { const [counts, items] = await Promise.all([this.repository.read("Stock_Counts", { fresh: true }), this.repository.read("Stock_Count_Items", { fresh: true })]); return counts.map(mapCount).filter((v) => v.branchId === user.branchId).map((v) => ({ ...v, items: items.map(mapCountItem).filter((i) => i.countId === v.countId) })); }

  async rebuildBalances(user: SessionUser): Promise<StockBalance[]> {
    if (user.role !== "owner") throw new AppError(403, "FORBIDDEN", "เฉพาะ owner เท่านั้น");
    const movements = (await this.repository.read("Stock_Movements", { fresh: true })).map(mapMovement);
    const balances: StockBalance[] = [];
    for (const movement of movements) applyMovementToBalances(balances, movement);
    await this.repository.clearAndWrite("Stock_Balances", balances.map(balanceRecord));
    return balances;
  }
}
