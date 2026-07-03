"use client";

import type { ChangeEventHandler } from "react";
import { ItemImage } from "./item-image";
import { FormField, GameButton, SelectableTile, StatusBadge } from "./page-kit";
import { adjustQuantity, MOVEMENT_ACTIONS, type MovementType } from "../lib/movement-workflow";
import type { Item } from "../lib/types";

export function MovementTypePicker({ value, onChange, onCount }: { value: MovementType; onChange: (value: MovementType) => void; onCount: () => void }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7" aria-label="เลือกประเภทงาน">
    {MOVEMENT_ACTIONS.slice(0, 2).map((action) => <MovementActionButton key={action.value} action={action} active={value === action.value} onClick={() => onChange(action.value)} />)}
    <SelectableTile onClick={onCount} className="min-h-28 p-3">
      <span className="font-mono text-[10px] font-black tracking-[.18em] opacity-70">COUNT</span>
      <span className="mt-2 block text-base font-black leading-tight">นับสต๊อก</span>
      <span className="mt-1 hidden text-xs font-bold opacity-70 sm:block">ตรวจนับหลายรายการ</span>
    </SelectableTile>
    {MOVEMENT_ACTIONS.slice(2).map((action) => <MovementActionButton key={action.value} action={action} active={value === action.value} onClick={() => onChange(action.value)} />)}
  </div>;
}

function MovementActionButton({ action, active, onClick }: { action: typeof MOVEMENT_ACTIONS[number]; active: boolean; onClick: () => void }) {
  return <SelectableTile selected={active} onClick={onClick} className="min-h-28 p-3">
      <span className="font-mono text-[10px] font-black tracking-[.18em] opacity-70">{action.code}</span>
      <span className="mt-2 block text-base font-black leading-tight">{action.label}</span>
      <span className="mt-1 hidden text-xs font-bold opacity-70 sm:block">{action.description}</span>
    </SelectableTile>;
}

export function MovementProductCard({ item, balance, onSelect }: { item: Item; balance: number; onSelect: (itemId: string) => void }) {
  return <SelectableTile data-item-id={item.itemId} onClick={() => onSelect(item.itemId)} className="group flex min-w-0 flex-col overflow-hidden p-0">
    <ItemImage src={item.imageUrl} itemName={item.itemName} className="w-full border-b border-[var(--color-game-border)]" />
    <span className="flex min-w-0 flex-1 flex-col p-3">
      <span className="truncate font-black">{item.itemName}</span>
      <span className="mt-1 text-xs font-bold text-[var(--color-game-muted)]">หน่วย · {item.unit}</span>
      <span className="mt-3 border-t border-dashed border-[var(--color-game-border)] pt-2"><StatusBadge>คงเหลือ {balance} {item.unit}</StatusBadge></span>
    </span>
  </SelectableTile>;
}

export function QuantityStepper({ value, unit, minimum = 0.01, ariaLabel = "จำนวน Movement", onChange }: { value: number; unit: string; minimum?: number; ariaLabel?: string; onChange: (value: number) => void }) {
  const input: ChangeEventHandler<HTMLInputElement> = (event) => onChange(Number(event.target.value));
  return <div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[-10, -1, 1, 10].map((delta) => <GameButton key={delta} type="button" variant="secondary" onClick={() => onChange(adjustQuantity(value, delta, minimum))} className="min-h-12">{delta > 0 ? `+${delta}` : delta}</GameButton>)}
    </div>
    <FormField className="mt-3" label="จำนวน">
      <span className="flex min-w-0 items-stretch rounded-[5px] border border-[var(--color-game-border)] bg-[var(--color-game-cream)] shadow-[var(--shadow-game-sm)]">
        <input aria-label={ariaLabel} className="min-h-14 min-w-0 flex-1 bg-transparent px-4 text-2xl font-black leading-normal outline-none" type="number" inputMode="decimal" min={minimum} step="0.01" value={value} onChange={input} />
        <span className="grid min-w-16 place-items-center border-l border-[var(--color-game-border)] bg-[var(--color-game-cream-active)] px-3 font-black">{unit}</span>
      </span>
    </FormField>
  </div>;
}
