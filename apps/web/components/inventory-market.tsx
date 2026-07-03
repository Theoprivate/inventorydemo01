"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ItemImage } from "./item-image";
import { EmptyState, GameButton, GamePanel, StatusBadge } from "./page-kit";
import type { RequestableItem } from "../lib/types";

const focusRing = "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#a85f36] focus-visible:ring-offset-2";

export function PixelPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <GamePanel className={className}>{children}</GamePanel>;
}

export function PixelButton({ className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <GameButton className={`market-button ${className}`} {...props}>{children}</GameButton>;
}

export function PixelTab({ label, code, count, active, onClick }: { label: string; code: string; count: number; active: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} title={`${code} · ${count} รายการ`} className={`market-button flex h-[42px] w-auto shrink-0 snap-start items-center gap-2 rounded-[5px] border-2 px-3 text-left transition-[transform,box-shadow,background-color] duration-100 active:translate-y-0.5 ${focusRing} ${active ? "border-[#71331f] bg-[#b85d2e] text-white shadow-[2px_3px_0_#71331f]" : "border-[#d5ae73] bg-[#fff0ce] text-[#4a2a16] shadow-[2px_3px_0_#c49b63] hover:-translate-y-0.5 hover:bg-[#ffe6b5]"}`}>
    <span className="text-base leading-none [text-shadow:1px_1px_0_#fff]" aria-hidden="true">{categoryMark(label)}</span>
    <span className="whitespace-nowrap text-[13px] font-black leading-tight">{label}</span>
    <span className="sr-only">{count} รายการ</span>
  </button>;
}

function categoryMark(label: string) {
  if (label === "ทั้งหมด") return "🧺";
  if (/วัตถุดิบ|อาหาร|ผัก|เนื้อ/.test(label)) return "🥕";
  if (/เครื่องดื่ม|น้ำ/.test(label)) return "🧃";
  if (/บรรจุ|กล่อง|แพ็ก/.test(label)) return "📦";
  if (/สะอาด|ล้าง/.test(label)) return "🧴";
  if (/ครัว|อุปกรณ์/.test(label)) return "🍳";
  return "🏷️";
}

export function ItemMarketCard({ item, selected, onToggle }: { item: RequestableItem; selected: boolean; onToggle: () => void }) {
  const lowStock = item.totalQty <= item.storeItem.minQty;
  return <article className={`market-card group relative flex h-[300px] min-w-0 flex-col overflow-hidden rounded-[7px] border bg-[#fff7e6] transition-[transform,box-shadow,border-color] duration-100 ${selected ? "border-[#a54829] shadow-[4px_5px_0_#a85b35,inset_0_0_0_2px_#efc37e]" : "border-[#d5ae73] shadow-[4px_5px_0_#d0aa74] hover:-translate-y-0.5 hover:border-[#b67c45] hover:shadow-[5px_6px_0_#c5925b]"}`}>
    {selected && <span className="absolute right-2 top-2 z-10 rounded-[4px] border border-[#743b22] bg-[#a54829] px-2 py-0.5 text-[9px] font-black text-white shadow-[1px_2px_0_#6b351f]">เลือกแล้ว</span>}
    <div className="relative h-[120px] shrink-0 overflow-hidden border-b border-[#ead1a7] bg-[#fffaf0] px-3 py-2">
      <ItemImage src={item.imageUrl} itemName={item.itemName} className="h-full w-full" />
    </div>
    <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
      <h3 className="line-clamp-2 min-h-[2.4rem] text-[16px] font-black leading-[1.25] text-[#3d281b]">{item.itemName}</h3>
      <div className="mt-1 space-y-0.5 text-[13px] font-bold leading-[17px] text-[#765039]">
        <p>หน่วย : <span className="text-[#4b3526]">{item.unit}</span></p>
        <p>คงเหลือ <span className={`font-black ${lowStock ? "text-[#a54829]" : "text-[#5e3d27]"}`}>{item.totalQty} {item.unit}</span></p>
        <p className="truncate text-[11px] text-[#987457]">ขั้นต่ำ <strong>{item.storeItem.minQty}</strong> · เป้าหมาย <strong>{item.storeItem.targetQty}</strong></p>
      </div>
      <PixelButton type="button" onClick={onToggle} aria-pressed={selected} className={`mt-auto min-h-11 w-full px-2 py-1.5 text-[13px] ${selected ? "border-[#a87145] bg-[#efd7b5] text-[#70462c] shadow-[0_3px_0_#c29a6d] hover:bg-[#e7c9a0]" : ""}`}>{selected ? "− นำออก" : "+ ใส่รถเข็น"}</PixelButton>
    </div>
  </article>;
}

export function StatusChip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "danger" }) {
  return <StatusBadge tone={tone}>{children}</StatusBadge>;
}

export function EmptyStatePixel({ title, description }: { title: string; description: string }) {
  return <EmptyState title={title} description={description} />;
}

export function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>;
}
