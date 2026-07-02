import { describe, expect, it } from "vitest";
import { mapItem, mapStoreItem, requestItemRecord, requestRecord } from "./mappers.js";

describe("Google Sheets row mappers", () => {
  it("maps item headers to camelCase", () => expect(mapItem({ Item_ID: " I1 ", Item_Name: " น้ำ ", Category_ID: "C1", Unit: "ขวด", Image_URL: "", Description: "", Is_Active: "TRUE", Created_At: "now" })).toMatchObject({ itemId: "I1", itemName: "น้ำ", isActive: true }));
  it("parses checkbox and numeric fields safely", () => expect(mapStoreItem({ Store_Item_ID: "SI1", Branch_ID: "B1", Item_ID: "I1", Min_Qty: "2.5", Target_Qty: "10", Default_Location_ID: "L1", Allow_Request: "TRUE", Require_Daily_Count: "FALSE", Is_Active: "TRUE" })).toMatchObject({ minQty: 2.5, targetQty: 10, allowRequest: true, requireDailyCount: false }));
  it("maps a stock request row to exact Sheet headers", () => expect(requestRecord({ requestId: "REQ-1", requestDate: "2026-07-02", branchId: "B1", requestedBy: "U1", requestStatus: "PENDING", approvedBy: "", completedAt: "", note: "n", createdAt: "now" })).toEqual({ Request_ID: "REQ-1", Request_Date: "2026-07-02", Branch_ID: "B1", Requested_By: "U1", Request_Status: "PENDING", Approved_By: "", Completed_At: "", Note: "n", Created_At: "now" }));
  it("maps request item quantities and unit", () => expect(requestItemRecord({ requestItemId: "REQI-1", requestId: "REQ-1", itemId: "I1", requestedQty: 2, approvedQty: 0, issuedQty: 0, unit: "kg", itemStatus: "PENDING", note: "n" })).toMatchObject({ Requested_Qty: 2, Approved_Qty: 0, Issued_Qty: 0, Unit: "kg" }));
});
