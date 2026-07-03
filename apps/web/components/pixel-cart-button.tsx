import type { MouseEventHandler } from "react";

export function PixelCartButton({ count, hidden = false, onClick }: { count: number; hidden?: boolean; onClick: MouseEventHandler<HTMLButtonElement> }) {
  if (hidden) return null;
  return <button type="button" onClick={onClick} aria-label="เปิดรถเข็นเบิกของ" className="market-cart-button market-button fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-[45] flex min-h-[64px] items-center gap-2 border-2 border-[#71331f] bg-[#b85d2e] p-3 font-black text-white shadow-[6px_7px_0_#71331f] transition-[transform,box-shadow,background-color] duration-100 hover:-translate-y-1 hover:bg-[#c96934] active:translate-y-[5px] active:shadow-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#bd825b] focus-visible:ring-offset-2 sm:gap-3 sm:px-5 lg:bottom-7">
    <span className="grid h-9 w-9 place-items-center bg-[#f4c45a] text-[#684126] shadow-[inset_0_-3px_0_#d8952a]"><PixelCartIcon /></span>
    <span className="hidden sm:inline">รถเข็นเบิก</span>
    <span className="grid h-8 min-w-7 place-items-center border-2 border-[#71331f] bg-[#fff7e6] px-1 text-sm text-[#5d3a25] shadow-[2px_2px_0_#71331f] sm:min-w-8" aria-label={`${count} รายการ`}>{count}</span>
  </button>;
}

export function PixelCartIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" shapeRendering="crispEdges"><path d="M2 3h4v3h2v9h11v-2H10v-2h10V6H8V4H2zM9 17h3v3H9zm7 0h3v3h-3z"/></svg>;
}
