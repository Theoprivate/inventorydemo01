import "dotenv/config";
import { createSheetsClient, GOOGLE_SHEETS_SCOPE } from "../src/plugins/google-sheets.js";
import { GoogleSheetsInventoryRepository } from "../src/repositories/google-sheets-inventory-repository.js";

try {
  const { sheets, spreadsheetId } = createSheetsClient();
  const repository = new GoogleSheetsInventoryRepository(sheets, spreadsheetId);
  const results = await repository.checkSchema();
  let valid = true;
  console.log(`✓ Google Sheets connection`);
  console.log(GOOGLE_SHEETS_SCOPE.endsWith("/spreadsheets") ? "✓ write-capable scope configured" : "✗ readonly scope is not allowed");
  for (const result of results) {
    if (!result.exists) { valid = false; console.error(`✗ ${result.tab}: missing tab`); }
    else if (result.missingHeaders.length) { valid = false; console.error(`✗ ${result.tab}: missing headers ${result.missingHeaders.join(", ")}`); }
    else console.log(`✓ ${result.tab}`);
  }
  if (!valid) process.exitCode = 1;
} catch (error) {
  const status = error && typeof error === "object" && "response" in error ? (error as { response?: { status?: number } }).response?.status : undefined;
  console.error(`✗ Google Sheets check failed${status ? ` (HTTP ${status})` : ""}`);
  process.exitCode = 1;
}
