import "dotenv/config";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { SHEET_HEADERS } from "../src/models.js";
import { createSheetsClient, GOOGLE_SHEETS_SCOPE } from "../src/plugins/google-sheets.js";
import { GoogleSheetsInventoryRepository } from "../src/repositories/google-sheets-inventory-repository.js";
import { stringCell } from "../src/utils/sheets.js";

try {
  const errors: string[] = [];
  const { sheets, spreadsheetId } = createSheetsClient();
  const repository = new GoogleSheetsInventoryRepository(sheets, spreadsheetId);
  const schema = await repository.checkSchema();
  for (const tab of ["Stock_Requests", "Stock_Request_Items"] as const) {
    const result = schema.find((entry) => entry.tab === tab);
    if (!result?.exists || result.missingHeaders.length) throw new Error(`${tab}: ${result?.missingHeaders.join(", ") || "missing tab"}`);
    console.log(`✓ ${tab} headers (${SHEET_HEADERS[tab].length})`);
  }
  if (!GOOGLE_SHEETS_SCOPE.endsWith("/spreadsheets")) throw new Error("readonly scope configured");
  console.log("✓ write-capable scope configured (check remains read-only)");

  const [items, storeItems, users, branches] = await Promise.all([repository.read("Items"), repository.read("Store_Items"), repository.read("Users"), repository.read("Branches")]);
  const itemIds = new Set(items.map((row) => stringCell(row.Item_ID)).filter(Boolean));
  const branchIds = new Set(branches.map((row) => stringCell(row.Branch_ID)).filter(Boolean));
  const missingItems = [...new Set(storeItems.filter((row) => stringCell(row.Store_Item_ID)).map((row) => stringCell(row.Item_ID)).filter((id) => id && !itemIds.has(id)))];
  const invalidUserBranches = [...new Set(users.filter((row) => stringCell(row.User_ID)).map((row) => stringCell(row.Branch_ID)).filter((id) => id && !branchIds.has(id)))];
  if (missingItems.length) { errors.push(`Store_Items references ${missingItems.length} missing Items`); console.error(`✗ ${errors.at(-1)}`); }
  else console.log("✓ Store_Items references existing Items");
  if (invalidUserBranches.length) { errors.push(`Users reference ${invalidUserBranches.length} missing Branch_ID values`); console.error(`✗ ${errors.at(-1)}`); }
  else console.log("✓ user Branch_ID values reference existing Branches");

  let missingImages = 0;
  for (const row of items) {
    const imageUrl = stringCell(row.Image_URL);
    if (!imageUrl.startsWith("/images/items/")) continue;
    try { await access(resolve(process.cwd(), "../web/public", imageUrl.slice(1))); } catch { missingImages += 1; console.error(`✗ missing local image: ${imageUrl}`); }
  }
  if (missingImages) errors.push(`${missingImages} local item image(s) are missing`);
  else console.log("✓ local item image paths exist");
  if (errors.length) throw new Error(errors.join("; "));
} catch (error) {
  console.error(`✗ request flow check failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
}
