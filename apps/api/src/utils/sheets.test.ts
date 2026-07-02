import { describe, expect, it } from "vitest";
import { assertHeaders, rowsToRecords } from "./sheets.js";

describe("Google Sheets headers", () => {
  it("accepts header whitespace after trimming", () => expect(() => assertHeaders("Stock_Requests", ["Request_ID", "Request_Date"], [" Request_ID ", "Request_Date "])).not.toThrow());
  it("reports the exact missing tab header", () => expect(() => assertHeaders("Stock_Request_Items", ["Requested_Qty"], ["Item_ID"])).toThrow("ตาราง Stock_Request_Items ไม่มีคอลัมน์ Requested_Qty"));
  it("maps records with normalized headers", () => expect(rowsToRecords(["Request_ID"], [[" REQ-1 "]])).toEqual([{ Request_ID: "REQ-1" }]));
});
