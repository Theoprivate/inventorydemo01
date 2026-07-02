import "dotenv/config";
import { randomUUID } from "node:crypto";
import { buildApp } from "../src/app.js";
import { booleanCell, stringCell } from "../src/utils/sheets.js";
import { createSheetsClient } from "../src/plugins/google-sheets.js";
import { GoogleSheetsInventoryRepository } from "../src/repositories/google-sheets-inventory-repository.js";

if (!process.argv.includes("--write")) {
  console.error("Refusing to write: pass --write for an explicit development verification run");
  process.exit(1);
}

const { sheets, spreadsheetId } = createSheetsClient();
const repository = new GoogleSheetsInventoryRepository(sheets, spreadsheetId);
const app = await buildApp(repository);

try {
  await app.ready();
  const [users, branches, items, storeItems, requestsBefore, requestItemsBefore] = await Promise.all([
    repository.read("Users", { fresh: true }), repository.read("Branches"), repository.read("Items"), repository.read("Store_Items"),
    repository.read("Stock_Requests", { fresh: true }), repository.read("Stock_Request_Items", { fresh: true }),
  ]);
  const activeUsers = users.filter((row) => booleanCell(row.Is_Active));
  const staff = activeUsers.find((row) => stringCell(row.Role).toLowerCase() === "staff") ?? activeUsers[0];
  if (!staff) throw new Error("No active user is available for verification");
  const role = stringCell(staff.Role).toLowerCase();
  const branchId = stringCell(staff.Branch_ID);
  if (!branches.some((row) => stringCell(row.Branch_ID) === branchId && booleanCell(row.Is_Active))) throw new Error("The staff branch is missing or inactive");
  const password = stringCell(staff.Password);
  if (!password || password.startsWith("$argon2")) throw new Error("The verification runner cannot derive the staff login password");

  const itemById = new Map(items.filter((row) => booleanCell(row.Is_Active)).map((row) => [stringCell(row.Item_ID), row]));
  const requestItems = storeItems.filter((row) => stringCell(row.Branch_ID) === branchId && booleanCell(row.Is_Active) && booleanCell(row.Allow_Request)).flatMap((row) => {
    const item = itemById.get(stringCell(row.Item_ID));
    return item ? [{ itemId: stringCell(item.Item_ID), requestedQty: 1, unit: stringCell(item.Unit), note: "development verification" }] : [];
  }).slice(0, 3);
  if (requestItems.length < 3) throw new Error("The staff branch has fewer than 3 requestable items");

  const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { username: stringCell(staff.Username), password } });
  if (login.statusCode !== 200) throw new Error(`Staff login failed (HTTP ${login.statusCode})`);
  const cookie = String(login.headers["set-cookie"] ?? "").split(";", 1)[0];
  const cookieName = process.env.COOKIE_NAME?.trim() || "restaurant_session";
  if (!cookie.startsWith(`${cookieName}=`)) throw new Error("Session cookie was not issued");

  const key = randomUUID();
  const payload = { note: "Development request flow verification", items: requestItems };
  console.log("• authenticated; submitting 3 request items");
  const create = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie, "idempotency-key": key }, payload });
  const createBody = create.json() as { ok?: boolean; data?: { requestId?: string; itemCount?: number }; error?: { code?: string; message?: string } };
  if (create.statusCode !== 200 || !createBody.ok || !createBody.data?.requestId) throw new Error(`Create failed (HTTP ${create.statusCode}, ${createBody.error?.code ?? "UNKNOWN"}): ${createBody.error?.message ?? "no message"}`);

  console.log("• request created; verifying idempotent retry");
  const retry = await app.inject({ method: "POST", url: "/api/v1/stock-requests", headers: { cookie, "idempotency-key": key }, payload });
  if (retry.statusCode !== 200 || retry.json().data?.requestId !== createBody.data.requestId) throw new Error(`Idempotent retry failed (HTTP ${retry.statusCode})`);
  console.log("• retry verified; reloading request detail");
  const detail = await app.inject({ method: "GET", url: `/api/v1/stock-requests/${createBody.data.requestId}`, headers: { cookie } });
  if (detail.statusCode !== 200 || detail.json().data?.items?.length !== 3) throw new Error(`Request detail verification failed (HTTP ${detail.statusCode})`);

  const [requestsAfter, requestItemsAfter] = await Promise.all([repository.read("Stock_Requests", { fresh: true }), repository.read("Stock_Request_Items", { fresh: true })]);
  if (requestsAfter.length !== requestsBefore.length + 1 || requestItemsAfter.length !== requestItemsBefore.length + 3) throw new Error("Unexpected row count after create/retry verification");
  console.log(`✓ active ${role} login and ${cookieName} cookie`);
  console.log(`✓ created request ${createBody.data.requestId} with 1 header row and 3 item rows`);
  console.log(`✓ duplicate retry did not create additional rows`);
  console.log(`✓ request detail reload returned 3 items`);
} catch (error) {
  console.error(`✗ write verification failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
} finally {
  await app.close();
}
