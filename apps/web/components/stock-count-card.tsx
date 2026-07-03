"use client";

import { ItemImage } from "./item-image";
import { FormField, GameCard, StatusBadge } from "./page-kit";
import { QuantityStepper } from "./stock-movement-ui";
import type { Item } from "../lib/types";

export function StockCountCard({ item, systemQty, countedQty, note, onCountedQtyChange, onNoteChange }: { item: Item; systemQty: number; countedQty: number; note: string; onCountedQtyChange: (value: number) => void; onNoteChange: (value: string) => void }) {
  const difference = countedQty - systemQty;
  return <GameCard className="min-w-0">
    <header className="grid grid-cols-[88px_minmax(0,1fr)] border-b border-[var(--color-game-border)]">
      <ItemImage src={item.imageUrl} itemName={item.itemName} className="h-full w-full border-r border-[var(--color-game-border)]" />
      <div className="min-w-0 p-3"><p className="truncate text-lg font-black text-[var(--color-game-brown)]">{item.itemName}</p><p className="mt-1 text-xs font-bold text-[var(--color-game-muted)]">ระบบ {systemQty} {item.unit}</p><StatusBadge className="mt-2" tone={difference < 0 ? "danger" : difference > 0 ? "warning" : "neutral"}>ต่าง {difference}</StatusBadge></div>
    </header>
    <div className="space-y-4 p-4">
      <QuantityStepper value={countedQty} unit={item.unit} minimum={0} ariaLabel={`จำนวนจริง ${item.itemName}`} onChange={(value) => onCountedQtyChange(Math.max(0, value))} />
      <FormField label="หมายเหตุรายการ"><input value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="ระบุเมื่อยอดต่าง (ถ้ามี)" /></FormField>
    </div>
  </GameCard>;
}
