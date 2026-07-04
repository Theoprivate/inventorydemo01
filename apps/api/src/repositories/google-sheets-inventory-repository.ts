import type { sheets_v4 } from "googleapis";
import { SHEET_HEADERS, type EmployeeKpiDaily, type SheetName, type SheetRecord, type User, type UserActivity, type UserStats, type XpTransaction } from "../models.js";
import { assertHeaders, filterValidItemRecords, rowsToRecords, stringCell, toSheetValue } from "../utils/sheets.js";
import { employeeKpiDailyRecord, mapEmployeeKpiDaily, mapUser, mapUserActivity, mapUserStats, mapXpTransaction, userActivityRecord, userStatsRecord, xpTransactionRecord } from "../utils/mappers.js";
import { AppError, sheetsWriteError } from "../errors.js";
import type { InventoryRepository } from "./inventory-repository.js";

const MASTER_TABS = new Set<SheetName>(["Branches", "Categories", "Items", "Store_Items", "Locations"]);
const CACHE_MS = 45_000;

export class GoogleSheetsInventoryRepository implements InventoryRepository {
  private cache = new Map<SheetName, { expires: number; records: SheetRecord[] }>();
  constructor(private readonly sheets: sheets_v4.Sheets, private readonly spreadsheetId: string) {}

  async read(tab: SheetName, options: { fresh?: boolean } = {}): Promise<SheetRecord[]> {
    const cached = this.cache.get(tab);
    if (!options.fresh && cached && cached.expires > Date.now()) return structuredClone(cached.records);
    const response = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${tab}!A:Z` });
    const rows = (response.data.values ?? []) as string[][];
    const actualHeaders = (rows[0] ?? []).map(stringCell);
    assertHeaders(tab, SHEET_HEADERS[tab], actualHeaders);
    const mappedRecords = rowsToRecords(actualHeaders, rows.slice(1));
    const records = tab === "Items" ? filterValidItemRecords(mappedRecords) : mappedRecords;
    if (MASTER_TABS.has(tab)) this.cache.set(tab, { expires: Date.now() + CACHE_MS, records });
    return structuredClone(records);
  }

  async append(tab: SheetName, records: SheetRecord[]): Promise<void> {
    if (!records.length) return;
    const headers = SHEET_HEADERS[tab];
    await this.sheets.spreadsheets.values.append({ spreadsheetId: this.spreadsheetId, range: `${tab}!A:${columnName(headers.length)}`, valueInputOption: "RAW", requestBody: { values: records.map((record) => headers.map((header) => toSheetValue(record[header] ?? ""))) } });
    this.invalidate(tab);
  }

  async createStockRequest(request: SheetRecord, items: SheetRecord[]): Promise<boolean> {
    const requestHeaders = SHEET_HEADERS.Stock_Requests;
    const itemHeaders = SHEET_HEADERS.Stock_Request_Items;
    try {
      const response = await this.sheets.spreadsheets.values.batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: [
          `Stock_Requests!A:${columnName(requestHeaders.length)}`,
          `Stock_Request_Items!A:${columnName(itemHeaders.length)}`,
        ],
      });
      const requestRows = (response.data.valueRanges?.[0]?.values ?? []) as string[][];
      const itemRows = (response.data.valueRanges?.[1]?.values ?? []) as string[][];
      assertHeaders("Stock_Requests", requestHeaders, requestRows[0] ?? []);
      assertHeaders("Stock_Request_Items", itemHeaders, itemRows[0] ?? []);

      const requestId = stringCell(request.Request_ID);
      if (requestRows.slice(1).some((row) => stringCell(row[0]) === requestId)) {
        return false;
      }
      const requestRow = nextDataRow(requestRows);
      const itemRow = nextDataRow(itemRows);
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: [
            { range: `Stock_Requests!A${requestRow}:${columnName(requestHeaders.length)}${requestRow}`, values: [requestHeaders.map((header) => toSheetValue(request[header] ?? ""))] },
            { range: `Stock_Request_Items!A${itemRow}:${columnName(itemHeaders.length)}${itemRow + items.length - 1}`, values: items.map((record) => itemHeaders.map((header) => toSheetValue(record[header] ?? ""))) },
          ],
        },
      });
      this.invalidate("Stock_Requests");
      this.invalidate("Stock_Request_Items");
      return true;
    } catch (error) {
      throw sheetsWriteError(error);
    }
  }

  async upsert(tab: SheetName, keyHeader: string, records: SheetRecord[]): Promise<void> {
    if (!records.length) return;
    const headers = SHEET_HEADERS[tab];
    const keyIndex = headers.indexOf(keyHeader as never);
    if (keyIndex < 0) throw new Error(`Unknown key header ${keyHeader} for ${tab}`);
    const response = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${tab}!A:${columnName(headers.length)}` });
    const rows = (response.data.values ?? []) as string[][];
    assertHeaders(tab, headers, rows[0] ?? []);
    const indexByKey = new Map(rows.slice(1).map((row, index) => [stringCell(row[keyIndex]), index + 2]));
    const updates: sheets_v4.Schema$ValueRange[] = [];
    const additions: SheetRecord[] = [];
    for (const record of records) {
      const rowNumber = indexByKey.get(stringCell(record[keyHeader]));
      if (!rowNumber) additions.push(record);
      else updates.push({ range: `${tab}!A${rowNumber}:${columnName(headers.length)}${rowNumber}`, values: [headers.map((header) => toSheetValue(record[header] ?? ""))] });
    }
    if (updates.length) await this.sheets.spreadsheets.values.batchUpdate({ spreadsheetId: this.spreadsheetId, requestBody: { valueInputOption: "RAW", data: updates } });
    if (additions.length) await this.append(tab, additions);
    this.invalidate(tab);
  }

  async clearAndWrite(tab: SheetName, records: SheetRecord[]): Promise<void> {
    const headers = SHEET_HEADERS[tab];
    await this.sheets.spreadsheets.values.clear({ spreadsheetId: this.spreadsheetId, range: `${tab}!A2:Z` });
    if (records.length) await this.append(tab, records);
    this.invalidate(tab);
  }

  invalidate(tab?: SheetName): void { if (tab) this.cache.delete(tab); else this.cache.clear(); }

  async findUserById(userId: string): Promise<User | undefined> {
    return (await this.read("Users", { fresh: true })).map(mapUser).find((user) => user.userId === userId);
  }

  async findUserByUsername(username: string): Promise<User | undefined> {
    return (await this.read("Users", { fresh: true })).map(mapUser).find((user) => user.username === username);
  }

  async updateLastLogin(userId: string, timestamp: string): Promise<void> {
    await this.updateUserTimestamps(userId, "Last_Login_At", timestamp);
  }

  async updateLastActive(userId: string, timestamp: string): Promise<void> {
    await this.updateUserTimestamps(userId, "Last_Active_At", timestamp);
  }

  async appendActivity(activity: UserActivity): Promise<void> {
    await this.append("User_Activities", [userActivityRecord(activity)]);
  }

  async findActivitiesByUser(userId: string): Promise<UserActivity[]> {
    return (await this.read("User_Activities", { fresh: true })).map(mapUserActivity).filter((activity) => activity.userId === userId).sort(newestFirst);
  }

  async findActivityById(activityId: string): Promise<UserActivity | undefined> {
    return (await this.read("User_Activities", { fresh: true })).map(mapUserActivity).find((activity) => activity.activityId === activityId);
  }

  async findActivityByEntity(entityType: string, entityId: string): Promise<UserActivity[]> {
    return (await this.read("User_Activities", { fresh: true })).map(mapUserActivity).filter((activity) => activity.entityType === entityType && activity.entityId === entityId).sort(newestFirst);
  }

  async appendXpTransaction(transaction: XpTransaction): Promise<void> {
    await this.append("XP_Transactions", [xpTransactionRecord(transaction)]);
  }

  async findXpTransactionsByUser(userId: string): Promise<XpTransaction[]> {
    return (await this.read("XP_Transactions", { fresh: true })).map(mapXpTransaction).filter((transaction) => transaction.userId === userId).sort(newestFirst);
  }

  async findXpTransactionByActivityId(activityId: string): Promise<XpTransaction | undefined> {
    return (await this.read("XP_Transactions", { fresh: true })).map(mapXpTransaction).find((transaction) => transaction.activityId === activityId);
  }

  async sumXpByUser(userId: string): Promise<number> {
    return (await this.findXpTransactionsByUser(userId)).reduce((total, transaction) => total + transaction.xpAmount, 0);
  }

  async findUserStats(userId: string): Promise<UserStats | undefined> {
    return (await this.read("User_Stats", { fresh: true })).map(mapUserStats).find((stats) => stats.userId === userId);
  }

  async upsertUserStats(stats: UserStats): Promise<void> {
    await this.upsert("User_Stats", "User_ID", [userStatsRecord(stats)]);
  }

  async findDailyKpi(userId: string, kpiDate: string): Promise<EmployeeKpiDaily | undefined> {
    return (await this.read("Employee_KPI_Daily", { fresh: true })).map(mapEmployeeKpiDaily).find((kpi) => kpi.userId === userId && kpi.kpiDate === kpiDate);
  }

  async upsertDailyKpi(kpi: EmployeeKpiDaily): Promise<void> {
    const existing = await this.findDailyKpi(kpi.userId, kpi.kpiDate);
    const value = existing ? { ...kpi, kpiId: existing.kpiId } : kpi;
    if (!value.kpiId) throw new AppError(400, "KPI_ID_REQUIRED", "KPI_ID is required");
    await this.upsert("Employee_KPI_Daily", "KPI_ID", [employeeKpiDailyRecord(value)]);
  }

  async checkSchema(): Promise<Array<{ tab: SheetName; missingHeaders: string[]; exists: boolean }>> {
    const metadata = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId, fields: "sheets.properties.title" });
    const titles = new Set((metadata.data.sheets ?? []).map((sheet) => sheet.properties?.title ?? ""));
    const tabs = Object.keys(SHEET_HEADERS) as SheetName[];
    const ranges = tabs.filter((tab) => titles.has(tab)).map((tab) => `${tab}!1:1`);
    const values = ranges.length ? await this.sheets.spreadsheets.values.batchGet({ spreadsheetId: this.spreadsheetId, ranges }) : null;
    let rangeIndex = 0;
    return tabs.map((tab) => {
      if (!titles.has(tab)) return { tab, missingHeaders: [...SHEET_HEADERS[tab]], exists: false };
      const actual = ((values?.data.valueRanges?.[rangeIndex++]?.values?.[0] ?? []) as string[]).map(stringCell);
      return { tab, missingHeaders: SHEET_HEADERS[tab].filter((header) => !actual.includes(header)), exists: true };
    });
  }

  private async updateUserTimestamps(userId: string, targetHeader: "Last_Login_At" | "Last_Active_At", timestamp: string): Promise<void> {
    const headers = SHEET_HEADERS.Users;
    const response = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `Users!A:${columnName(headers.length)}` });
    const rows = (response.data.values ?? []) as string[][];
    assertHeaders("Users", headers, rows[0] ?? []);
    const userIdIndex = headers.indexOf("User_ID");
    const rowIndex = rows.slice(1).findIndex((row) => stringCell(row[userIdIndex]) === userId);
    if (rowIndex < 0) throw new AppError(404, "USER_NOT_FOUND", "ไม่พบผู้ใช้");
    const rowNumber = rowIndex + 2;
    const targetColumn = columnName(headers.indexOf(targetHeader) + 1);
    const updatedColumn = columnName(headers.indexOf("Updated_At") + 1);
    try {
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: [
            { range: `Users!${targetColumn}${rowNumber}`, values: [[timestamp]] },
            { range: `Users!${updatedColumn}${rowNumber}`, values: [[timestamp]] },
          ],
        },
      });
    } catch (error) {
      throw sheetsWriteError(error);
    }
    this.invalidate("Users");
  }
}

function newestFirst<T extends { createdAt: string }>(a: T, b: T): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function nextDataRow(rows: string[][]): number {
  for (let index = rows.length - 1; index >= 1; index -= 1) {
    if (stringCell(rows[index]?.[0])) return index + 2;
  }
  return 2;
}

function columnName(count: number): string {
  let value = count;
  let result = "";
  while (value > 0) { value -= 1; result = String.fromCharCode(65 + (value % 26)) + result; value = Math.floor(value / 26); }
  return result;
}
