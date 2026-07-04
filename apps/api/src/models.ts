export type Role = "owner" | "manager" | "stock" | "staff";
export type RequestStatus = "PENDING" | "APPROVED" | "PARTIAL" | "COMPLETED" | "REJECTED" | "CANCELLED";
export type MovementType = "RECEIVE" | "ISSUE" | "TRANSFER" | "WASTE" | "RETURN" | "ADJUSTMENT";
export type LocationType = "WAREHOUSE" | "FRIDGE" | "KITCHEN" | "COUNTER" | "STORAGE";

export interface User {
  userId: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: Role;
  branchId: string;
  isActive: boolean;
  createdAt: string;
  avatarUrl: string;
  lastLoginAt: string;
  lastActiveAt: string;
  updatedAt: string;
}
export interface SessionUser { userId: string; username: string; displayName: string; role: Role; branchId: string; branchName: string }
export interface Branch { branchId: string; branchName: string; isActive: boolean; createdAt: string }
export interface Category { categoryId: string; categoryName: string; sortOrder: number; isActive: boolean }
export interface Item { itemId: string; itemName: string; categoryId: string; unit: string; imageUrl: string; description: string; isActive: boolean; createdAt: string }
export interface StoreItem { storeItemId: string; branchId: string; itemId: string; minQty: number; targetQty: number; defaultLocationId: string; allowRequest: boolean; requireDailyCount: boolean; isActive: boolean }
export interface Location { locationId: string; locationName: string; branchId: string; locationType: LocationType; isActive: boolean }
export interface StockBalance { balanceId: string; branchId: string; locationId: string; itemId: string; currentQty: number; updatedAt: string }
export interface StockMovement { movementId: string; movementDate: string; branchId: string; itemId: string; movementType: MovementType; fromLocationId: string; toLocationId: string; qty: number; unit: string; referenceType: string; referenceId: string; createdBy: string; note: string; createdAt: string }
export interface StockRequest { requestId: string; requestDate: string; branchId: string; requestedBy: string; requestStatus: RequestStatus; approvedBy: string; completedAt: string; note: string; createdAt: string }
export interface StockRequestItem { requestItemId: string; requestId: string; itemId: string; requestedQty: number; approvedQty: number; issuedQty: number; unit: string; itemStatus: string; note: string }
export interface StockCount { countId: string; countDate: string; branchId: string; locationId: string; countRound: string; countedBy: string; countStatus: string; note: string; createdAt: string }
export interface StockCountItem { countItemId: string; countId: string; itemId: string; systemQty: number; countedQty: number; varianceQty: number; unit: string; note: string }
export interface UserActivity { activityId: string; activityDate: string; userId: string; branchId: string; action: string; entityType: string; entityId: string; result: string; detail: string; metadataJson: string; createdAt: string }
export interface UserStats { userId: string; totalXp: number; currentLevel: number; currentLevelXp: number; nextLevelXp: number; currentStreak: number; longestStreak: number; lastActiveDate: string; lastXpAt: string; updatedAt: string }
export interface XpTransaction { xpTransactionId: string; userId: string; activityId: string; xpAmount: number; reason: string; entityType: string; entityId: string; createdAt: string }
export interface EmployeeKpiDaily {
  kpiId: string;
  kpiDate: string;
  userId: string;
  branchId: string;
  assignedTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  completionRate: number;
  onTimeRate: number;
  stockCountTasks: number;
  stockCountAccuracy: number;
  discrepancyCount: number;
  requestsCreated: number;
  requestsApproved: number;
  requestsRejected: number;
  requestsFulfilled: number;
  movementsCreated: number;
  activeMinutes: number;
  loginCount: number;
  updatedAt: string;
}

export interface RequestDetail extends StockRequest { items: Array<StockRequestItem & { item?: Item }>; requester?: Pick<User, "userId" | "displayName" | "username"> }
export interface DashboardSummary { pendingRequests: number; lowStockItems: number; dailyCountItems: number }

export const SHEET_HEADERS = {
  Users: ["User_ID", "Username", "Password", "Display_Name", "Role", "Branch_ID", "Is_Active", "Created_At", "Password_Hash", "Avatar_URL", "Last_Login_At", "Last_Active_At", "Updated_At"],
  Branches: ["Branch_ID", "Branch_Name", "Is_Active", "Created_At"],
  Categories: ["Category_ID", "Category_Name", "Sort_Order", "Is_Active"],
  Items: ["Item_ID", "Item_Name", "Category_ID", "Unit", "Image_URL", "Description", "Is_Active", "Created_At"],
  Store_Items: ["Store_Item_ID", "Branch_ID", "Item_ID", "Min_Qty", "Target_Qty", "Default_Location_ID", "Allow_Request", "Require_Daily_Count", "Is_Active"],
  Locations: ["Location_ID", "Location_Name", "Branch_ID", "Location_Type", "Is_Active"],
  Stock_Balances: ["Balance_ID", "Branch_ID", "Location_ID", "Item_ID", "Current_Qty", "Updated_At"],
  Stock_Movements: ["Movement_ID", "Movement_Date", "Branch_ID", "Item_ID", "Movement_Type", "From_Location_ID", "To_Location_ID", "Qty", "Unit", "Reference_Type", "Reference_ID", "Created_By", "Note", "Created_At"],
  Stock_Requests: ["Request_ID", "Request_Date", "Branch_ID", "Requested_By", "Request_Status", "Approved_By", "Completed_At", "Note", "Created_At"],
  Stock_Request_Items: ["Request_Item_ID", "Request_ID", "Item_ID", "Requested_Qty", "Approved_Qty", "Issued_Qty", "Unit", "Item_Status", "Note"],
  Stock_Counts: ["Count_ID", "Count_Date", "Branch_ID", "Location_ID", "Count_Round", "Counted_By", "Count_Status", "Note", "Created_At"],
  Stock_Count_Items: ["Count_Item_ID", "Count_ID", "Item_ID", "System_Qty", "Counted_Qty", "Variance_Qty", "Unit", "Note"],
  User_Activities: ["Activity_ID", "Activity_Date", "User_ID", "Branch_ID", "Action", "Entity_Type", "Entity_ID", "Result", "Detail", "Metadata_JSON", "Created_At"],
  User_Stats: ["User_ID", "Total_XP", "Current_Level", "Current_Level_XP", "Next_Level_XP", "Current_Streak", "Longest_Streak", "Last_Active_Date", "Last_XP_At", "Updated_At"],
  XP_Transactions: ["XP_Transaction_ID", "User_ID", "Activity_ID", "XP_Amount", "Reason", "Entity_Type", "Entity_ID", "Created_At"],
  Employee_KPI_Daily: ["KPI_ID", "KPI_Date", "User_ID", "Branch_ID", "Assigned_Tasks", "Completed_Tasks", "On_Time_Tasks", "Completion_Rate", "On_Time_Rate", "Stock_Count_Tasks", "Stock_Count_Accuracy", "Discrepancy_Count", "Requests_Created", "Requests_Approved", "Requests_Rejected", "Requests_Fulfilled", "Movements_Created", "Active_Minutes", "Login_Count", "Updated_At"],
} as const;

export type SheetName = keyof typeof SHEET_HEADERS;
export type SheetRecord = Record<string, string | number | boolean>;
