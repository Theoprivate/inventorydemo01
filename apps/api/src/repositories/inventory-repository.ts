import type { SheetName, SheetRecord } from "../models.js";

export interface InventoryRepository {
  read(tab: SheetName, options?: { fresh?: boolean }): Promise<SheetRecord[]>;
  append(tab: SheetName, records: SheetRecord[]): Promise<void>;
  createStockRequest(request: SheetRecord, items: SheetRecord[]): Promise<boolean>;
  upsert(tab: SheetName, keyHeader: string, records: SheetRecord[]): Promise<void>;
  clearAndWrite(tab: SheetName, records: SheetRecord[]): Promise<void>;
  invalidate(tab?: SheetName): void;
  checkSchema(): Promise<Array<{ tab: SheetName; missingHeaders: string[]; exists: boolean }>>;
}
