"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  EmptyStatePixel,
  ItemMarketCard,
  PixelButton,
  PixelPanel,
  PixelTab,
  SearchIcon,
} from "@/components/inventory-market";
import { PixelCartButton } from "@/components/pixel-cart-button";
import { CartViewportPortal, PixelCartDrawer } from "@/components/pixel-cart-drawer";
import { get, post } from "@/lib/api";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { filterValidItems } from "@/lib/items";
import { MARKET_STALL_GRID_CLASS } from "@/lib/market-layout";
import type { CreateRequestResult, RequestableItem } from "@/lib/types";
import { useBackpack } from "@/stores/backpack";

const schema = z.object({ note: z.string().max(500) });
type Form = z.infer<typeof schema>;

export default function RequestRoomPage() {
  const router = useRouter();
  const query = useQuery({ queryKey: ["requestable-items"], queryFn: () => get<RequestableItem[]>("/requestable-items") });
  const bag = useBackpack();
  const requestKey = useRef<string | null>(null);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { note: bag.requestNote } });

  const submit = useMutation({
    mutationFn: (values: Form) => {
      requestKey.current ??= crypto.randomUUID();
      return post<CreateRequestResult>("/stock-requests", {
        note: values.note || undefined,
        items: bag.items.map((v) => ({ itemId: v.itemId, requestedQty: Number(v.requestedQty), unit: v.unit, note: v.note || undefined })),
      }, { "Idempotency-Key": requestKey.current });
    },
    onSuccess: (request) => {
      requestKey.current = null;
      bag.clear();
      router.push(`/inventory/requests/${request.requestId}`);
    },
  });

  useEffect(() => {
    if (!open) return;
    const unlockBodyScroll = lockBodyScroll(document.body);
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      unlockBodyScroll();
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const validItems = useMemo(() => filterValidItems(query.data ?? []), [query.data]);
  const categories = useMemo(() => Array.from(
    new Map(validItems.map((v) => [v.category?.categoryId ?? "other", v.category?.categoryName ?? "อื่น ๆ"])),
    ([id, name]) => ({ id, name }),
  ), [validItems]);
  const categoryCounts = useMemo(() => validItems.reduce<Record<string, number>>((counts, item) => {
    const id = item.category?.categoryId ?? "other";
    counts[id] = (counts[id] ?? 0) + 1;
    return counts;
  }, {}), [validItems]);
  const filtered = validItems.filter((v) => (!category || (v.category?.categoryId ?? "other") === category) && v.itemName.toLowerCase().includes(search.toLowerCase()));

  return <div className="request-market market-cart-clearance min-h-[calc(100vh-122px)] w-full text-[#3d281b]">
    <header className="market-entrance mb-3 flex w-full items-center gap-3">
      <span className="pixel-title-basket grid h-10 w-10 place-items-center text-[#b53f22]" aria-hidden="true"><svg viewBox="0 0 32 32" className="h-10 w-10 drop-shadow-[2px_2px_0_#6b351f]" shapeRendering="crispEdges"><path fill="#4a2a16" d="M4 10h24v5h-2l-2 13H8L6 15H4zm5-7h4v7H9zm10 0h4v7h-4z"/><path fill="#d94826" d="M7 13h18l-2 12H9z"/><path fill="#f09c24" d="M10 16h3v6h-3zm6 0h3v6h-3zm6 0h2v6h-2z"/></svg></span>
      <h1 className="text-[29px] font-black leading-none tracking-tight text-[#4a2a16] sm:text-[32px]">เลือกของ</h1>
    </header>

    <section aria-labelledby="market-items" className="w-full">
      <div className="mb-4 grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block w-full">
          <span className="sr-only">ค้นหาของในตลาด</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b603f]" aria-hidden="true"><SearchIcon /></span>
          <input className="market-search h-[52px] w-full rounded-[5px] border-2 border-[#a97746] bg-[#fff7e6] py-2.5 pl-12 pr-4 font-bold text-[#4b392c] shadow-[3px_4px_0_#c59a63] outline-none transition-[border-color,box-shadow] placeholder:font-medium placeholder:text-[#a79280] focus:border-[#754223] focus:shadow-[3px_4px_0_#a86b3e] focus-visible:ring-3 focus-visible:ring-[#bc855e]/35" placeholder="ค้นหาสินค้า..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <span className="whitespace-nowrap px-2 text-sm font-black text-[#634630]">ทั้งหมด {filtered.length} รายการ</span>
      </div>

      <div aria-labelledby="market-zones" className="mb-4">
      <h2 id="market-zones" className="sr-only">หมวดหมู่สินค้า</h2>
      <div className={MARKET_STALL_GRID_CLASS} role="group" aria-label="เลือกโซนสินค้า">
        <PixelTab label="ทั้งหมด" code="ALL STALLS" count={validItems.length} active={!category} onClick={() => setCategory("")} />
        {categories.map((v, index) => <PixelTab key={v.id} label={v.name} code={`STALL ${String(index + 1).padStart(2, "0")}`} count={categoryCounts[v.id] ?? 0} active={category === v.id} onClick={() => setCategory(v.id)} />)}
      </div>
      </div>
      <h2 id="market-items" className="sr-only">รายการสินค้า</h2>

      {query.isLoading ? <LoadingMarket /> : query.isError ? <MarketError error={query.error} retry={() => query.refetch()} /> : !filtered.length ? <EmptyStatePixel title="ไม่พบสินค้า" description="ลองเปลี่ยนหมวดหมู่หรือใช้คำค้นหาอื่น" /> : <div className="market-catalog grid w-full grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
        {filtered.map((item) => {
          const selected = bag.items.some((v) => v.itemId === item.itemId);
          return <ItemMarketCard key={item.itemId} item={item} selected={selected} onToggle={() => selected ? bag.remove(item.itemId) : bag.add({ itemId: item.itemId, itemName: item.itemName, unit: item.unit })} />;
        })}
      </div>}
    </section>

    <CartViewportPortal>
      <PixelCartButton count={bag.items.length} hidden={open} onClick={() => setOpen(true)} />
      {open && <PixelCartDrawer onClose={() => setOpen(false)} footer={bag.items.length ? <PixelButton type="submit" form="inventory-cart-form" className="min-h-12 w-full text-base" disabled={submit.isPending || bag.items.some((v) => !Number.isFinite(v.requestedQty) || v.requestedQty <= 0)}>{submit.isPending ? "กำลังส่งคำขอ..." : "ส่งคำขอเบิก"}</PixelButton> : undefined}>
        {!bag.items.length ? <EmptyStatePixel title="ยังไม่มีของในรถเข็น" description="ลองเลือกของจากตลาดก่อน" /> : <form id="inventory-cart-form" onSubmit={form.handleSubmit((v) => { if (!submit.isPending) submit.mutate(v); })}>
          <div className="mb-4 flex items-center justify-between rounded-xl border border-[#d2b48c] bg-[#f2dfc1] px-3 py-2 text-sm font-black text-[#65462f]">
            <span>ของที่เลือกทั้งหมด</span><span>{bag.items.length} รายการ</span>
          </div>
          <div className="space-y-4">{bag.items.map((v, index) => <PixelPanel className="p-3.5" key={v.itemId}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="font-mono text-[10px] font-black tracking-wider text-[#9b5d38]">SLOT {String(index + 1).padStart(2, "0")}</p><p className="truncate font-black">{v.itemName}</p></div>
              <button type="button" className="min-h-11 px-2 text-sm font-black text-[#8a5131] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#a85f36]" aria-label={`ลบ ${v.itemName} ออกจากกระเป๋า`} onClick={() => bag.remove(v.itemId)}>ลบ</button>
            </div>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <label><span className="mb-1 block text-xs font-bold">จำนวน</span><input aria-label={`จำนวน ${v.itemName}`} className="market-field min-h-11 w-full rounded-xl border border-[#d5b996] bg-white px-3 outline-none focus-visible:ring-3 focus-visible:ring-[#a85f36]" inputMode="decimal" type="number" min="0.01" step="0.01" value={v.requestedQty} onChange={(e) => bag.update(v.itemId, { requestedQty: Number(e.target.value) })} /></label>
              <span className="self-end rounded-xl border border-[#d0b28c] bg-[#f1dfc2] px-3 py-2.5 text-sm font-black text-[#65462f]">{v.unit}</span>
            </div>
            <label className="mt-3 block"><span className="mb-1 block text-xs font-bold">หมายเหตุรายการ</span><input className="market-field min-h-11 w-full rounded-xl border border-[#d5b996] bg-white px-3 outline-none placeholder:text-[#a79280] focus-visible:ring-3 focus-visible:ring-[#a85f36]" placeholder="ระบุเพิ่มเติม (ถ้ามี)" value={v.note} onChange={(e) => bag.update(v.itemId, { note: e.target.value })} /></label>
          </PixelPanel>)}</div>

          <label className="mt-5 block"><span className="mb-2 block font-black">หมายเหตุทั้งคำขอ</span><textarea className="market-field min-h-24 w-full resize-y rounded-xl border border-[#d5b996] bg-white p-3 outline-none placeholder:text-[#a79280] focus-visible:ring-3 focus-visible:ring-[#a85f36]" placeholder="ข้อความถึงทีมสต๊อก (ถ้ามี)" {...form.register("note")} onChange={(e) => { form.setValue("note", e.target.value); bag.setRequestNote(e.target.value); }} /></label>
          {submit.error && <div className="mt-4"><MarketError error={submit.error} /></div>}
        </form>}
      </PixelCartDrawer>}
    </CartViewportPortal>
  </div>;
}

function LoadingMarket() {
  return <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5" aria-label="กำลังโหลดสินค้า">
    {Array.from({ length: 10 }, (_, index) => <div key={index} className="animate-pulse overflow-hidden rounded-[7px] border border-[#d4b488] bg-[#fff9e9] p-3 shadow-[3px_4px_0_#dfc59d]"><div className="h-[104px] bg-[#efe1ca]"/><div className="mt-3 h-4 w-3/4 rounded bg-[#e5d5bd]"/><div className="mt-2 h-3 w-1/2 rounded bg-[#eadfcf]"/><div className="mt-4 h-9 rounded-[5px] bg-[#d2b184]"/></div>)}
  </div>;
}

function MarketError({ error, retry }: { error: unknown; retry?: () => void }) {
  const code = process.env.NODE_ENV === "development" && error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "";
  return <PixelPanel className="border-[#c18459] bg-[#fff5e7] p-4" >
    <p className="font-mono text-[10px] font-black tracking-[.2em] text-[#9b5b35]">SYSTEM ALERT</p>
    <p className="mt-1 font-black text-[#5c3925]">{error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ"}{code ? ` (${code})` : ""}</p>
    {retry && <button type="button" className="mt-3 min-h-11 font-black text-[#8d5231] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#a85f36]" onClick={retry}>ลองใหม่อีกครั้ง</button>}
  </PixelPanel>;
}
