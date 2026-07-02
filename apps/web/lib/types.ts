export type Role = "owner" | "manager" | "stock" | "staff";
export interface SessionUser { userId: string; username: string; displayName: string; role: Role; branchId: string; branchName: string }
export interface Category { categoryId: string; categoryName: string; sortOrder: number; isActive: boolean }
export interface Item { itemId: string; itemName: string; categoryId: string; unit: string; imageUrl: string; description: string; isActive: boolean; createdAt: string }
export interface StoreItem { storeItemId: string; branchId: string; itemId: string; minQty: number; targetQty: number; defaultLocationId: string; allowRequest: boolean; requireDailyCount: boolean; isActive: boolean }
export interface Location { locationId: string; locationName: string; branchId: string; locationType: string; isActive: boolean }
export interface StockBalance { balanceId: string; branchId: string; locationId: string; itemId: string; currentQty: number; updatedAt: string }
export interface RequestableItem extends Item { storeItem: StoreItem; category?: Category; totalQty: number }
export interface StockRequestItem { requestItemId: string; requestId: string; itemId: string; requestedQty: number; approvedQty: number; issuedQty: number; unit: string; itemStatus: string; note: string; item?: Item }
export interface StockRequest { requestId: string; requestDate: string; branchId: string; requestedBy: string; requestStatus: string; approvedBy: string; completedAt: string; note: string; createdAt: string; itemCount?: number; requestedTotal?: number; issuedTotal?: number; items?: StockRequestItem[]; requester?: { displayName: string; username: string } }
export interface CreateRequestResult { requestId: string; status: "PENDING"; itemCount: number }
export interface Movement { movementId: string; movementDate: string; branchId: string; itemId: string; movementType: string; fromLocationId: string; toLocationId: string; qty: number; unit: string; referenceType: string; referenceId: string; createdBy: string; note: string; createdAt: string }
export interface DashboardSummary { pendingRequests: number; lowStockItems: number; dailyCountItems: number }
