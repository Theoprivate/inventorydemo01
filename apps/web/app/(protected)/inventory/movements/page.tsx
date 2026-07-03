"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ActionBar, EmptyState, ErrorBox, FilterBar, FormField, GameButton, GamePanel, PageHeader, SelectableTile, StatusBadge } from "@/components/page-kit";
import { CartViewportPortal as ViewportPortal } from "@/components/pixel-cart-drawer";
import { MovementProductCard, MovementTypePicker, QuantityStepper } from "@/components/stock-movement-ui";
import { get, post } from "@/lib/api";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { filterValidItems } from "@/lib/items";
import { MOVEMENT_ACTIONS, movementLocationNeeds, type MovementType } from "@/lib/movement-workflow";
import type { Category, Item, Location, Movement, StockBalance } from "@/lib/types";

const schema = z.object({
  movementType: z.enum(["RECEIVE", "ISSUE", "TRANSFER", "WASTE", "RETURN", "ADJUSTMENT"]),
  itemId: z.string().min(1),
  fromLocationId: z.string(),
  toLocationId: z.string(),
  qty: z.coerce.number().positive(),
  note: z.string(),
  adjustmentDirection: z.enum(["increase", "decrease"]),
});
type Form = z.infer<typeof schema>;
const defaults: Form = { movementType: "RECEIVE", itemId: "", fromLocationId: "", toLocationId: "", qty: 1, note: "", adjustmentDirection: "increase" };

export default function MovementsPage() {
  const router = useRouter();
  const client = useQueryClient();
  const items = useQuery({ queryKey: ["items"], queryFn: () => get<Item[]>("/items") });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => get<Category[]>("/categories") });
  const locations = useQuery({ queryKey: ["locations"], queryFn: () => get<Location[]>("/locations") });
  const balances = useQuery({ queryKey: ["balances"], queryFn: () => get<StockBalance[]>("/stock-balances") });
  const history = useQuery({ queryKey: ["movements"], queryFn: () => get<Movement[]>("/stock-movements") });
  const [historyFilter, setHistoryFilter] = useState<"" | MovementType>("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const form = useForm<Form>({ defaultValues: defaults });
  const type = form.watch("movementType") as MovementType;
  const adjustmentDirection = form.watch("adjustmentDirection");
  const qty = Number(form.watch("qty"));

  const validItems = useMemo(() => filterValidItems(items.data ?? []).filter((item) => item.isActive), [items.data]);
  const balanceByItem = useMemo(() => (balances.data ?? []).reduce<Record<string, number>>((totals, balance) => {
    totals[balance.itemId] = (totals[balance.itemId] ?? 0) + balance.currentQty;
    return totals;
  }, {}), [balances.data]);
  const filteredItems = useMemo(() => validItems.filter((item) =>
    (!category || item.categoryId === category)
    && item.itemName.toLowerCase().includes(search.trim().toLowerCase()),
  ), [validItems, category, search]);
  const selectedItem = validItems.find((item) => item.itemId === selectedItemId);
  const visibleHistory = useMemo(() => (history.data ?? []).filter((movement) => !historyFilter || movement.movementType === historyFilter), [history.data, historyFilter]);
  const { needsFrom, needsTo } = movementLocationNeeds(type, adjustmentDirection);

  const save = useMutation({
    mutationFn: (input: Form) => {
      const value = schema.parse(input);
      const item = validItems.find((candidate) => candidate.itemId === value.itemId);
      return post("/stock-movements", { ...value, unit: item?.unit ?? "" });
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["movements"] }),
        client.invalidateQueries({ queryKey: ["balances"] }),
      ]);
      form.reset(defaults);
      setSelectedItemId("");
    },
  });

  useEffect(() => {
    if (!selectedItem) return;
    const unlock = lockBodyScroll(document.body);
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !save.isPending) setSelectedItemId(""); };
    document.addEventListener("keydown", close);
    return () => { unlock(); document.removeEventListener("keydown", close); };
  }, [selectedItem, save.isPending]);

  const chooseType = (value: MovementType) => {
    form.setValue("movementType", value);
    form.setValue("itemId", "");
    setSelectedItemId("");
  };
  const chooseItem = (itemId: string) => {
    form.setValue("itemId", itemId, { shouldValidate: true });
    form.setValue("qty", 1);
    setSelectedItemId(itemId);
  };
  const closePanel = () => {
    if (save.isPending) return;
    form.setValue("itemId", "");
    setSelectedItemId("");
  };

  return <div className="movement-game min-w-0 overflow-x-clip">
    <PageHeader eyebrow="Stock Movement · Game Mode" title="รับเข้าและเคลื่อนไหว" description="เลือกงาน เลือกสินค้า แล้วตรวจรายละเอียดก่อนยืนยัน" />

    <section aria-labelledby="movement-step-1" className="border-b-2 border-[var(--color-game-border-strong)] pb-7">
      <p className="page-market-header__eyebrow">STEP 01</p>
      <h2 id="movement-step-1" className="mb-4 mt-1 text-2xl font-black text-[var(--color-game-brown)]">เลือกประเภทงาน</h2>
      <MovementTypePicker value={type} onChange={chooseType} onCount={() => router.push("/inventory/count")} />
    </section>

    <section aria-labelledby="movement-step-2" className="py-7">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="page-market-header__eyebrow">STEP 02 · {MOVEMENT_ACTIONS.find((action) => action.value === type)?.label}</p><h2 id="movement-step-2" className="mt-1 text-2xl font-black text-[var(--color-game-brown)]">เลือกสินค้า</h2></div>
        <span className="text-sm font-black">{filteredItems.length} รายการ</span>
      </div>
      <FormField className="mb-4 max-w-3xl" label="ค้นหาสินค้า"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อสินค้า" /></FormField>
      <FilterBar className="mb-5 snap-x" label="กรองหมวดหมู่">
        <FilterButton label="ทั้งหมด" active={!category} onClick={() => setCategory("")} />
        {(categories.data ?? []).filter((value) => value.categoryId && value.categoryName).map((value) => <FilterButton key={value.categoryId} label={value.categoryName} active={category === value.categoryId} onClick={() => setCategory(value.categoryId)} />)}
      </FilterBar>
      {items.isError ? <ErrorBox error={items.error} /> : !filteredItems.length ? <EmptyState title="ไม่พบสินค้าที่เลือกได้" description="ลองเปลี่ยนหมวดหมู่หรือคำค้นหา" /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] sm:gap-5">
        {filteredItems.map((item) => <MovementProductCard key={item.itemId} item={item} balance={balanceByItem[item.itemId] ?? 0} onSelect={chooseItem} />)}
      </div>}
    </section>

    <section aria-labelledby="movement-history" className="border-t-2 border-[var(--color-game-border-strong)] pt-7">
      <div className="mb-4"><p className="page-market-header__eyebrow">MOVEMENT LOG</p><h2 id="movement-history" className="mt-1 text-2xl font-black text-[var(--color-game-brown)]">ประวัติล่าสุด</h2></div>
      <FilterBar className="mb-4" label="กรองประวัติ Movement"><FilterButton label="ทั้งหมด" active={!historyFilter} onClick={() => setHistoryFilter("")} />{MOVEMENT_ACTIONS.map((action) => <FilterButton key={action.value} label={action.label} active={historyFilter === action.value} onClick={() => setHistoryFilter(action.value)} />)}</FilterBar>
      {history.isError ? <ErrorBox error={history.error} /> : !visibleHistory.length ? <EmptyState title="ไม่มีประวัติ Movement" /> : <GamePanel className="divide-y divide-[var(--color-game-border)]">{visibleHistory.slice(0, 30).map((movement) => <article className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 p-4" key={movement.movementId}><div className="min-w-0"><p className="truncate font-black text-[var(--color-game-brown)]">{validItems.find((item) => item.itemId === movement.itemId)?.itemName || movement.itemId}</p><p className="mt-1 text-xs font-bold text-[var(--color-game-muted)]">{movement.movementType} · {movement.movementDate}{movement.note ? ` · ${movement.note}` : ""}</p></div><StatusBadge>{movement.qty} {movement.unit}</StatusBadge></article>)}</GamePanel>}
    </section>

    <ViewportPortal>{selectedItem && <div className="market-backdrop fixed inset-0 z-[60] overflow-hidden">
      <button type="button" aria-label="ยกเลิก Movement" onClick={closePanel} className="absolute inset-0 bg-[#2f2118]/55 backdrop-blur-[2px]" />
      <form onSubmit={form.handleSubmit((value) => { if (!save.isPending) save.mutate(value); })} className="market-drawer absolute inset-y-0 right-0 flex h-[100dvh] w-full min-w-0 max-w-[460px] flex-col border-l border-[var(--color-game-border)] bg-[var(--color-game-cream)] shadow-[-7px_0_0_#9d6a3b]">
        <header className="shrink-0 border-b border-[var(--color-game-border)] p-4 sm:p-6"><p className="page-market-header__eyebrow">STEP 03 · CONFIRM ACTION</p><div className="mt-2 flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-2xl font-black text-[var(--color-game-brown)]">{selectedItem.itemName}</h2><p className="mt-1 text-sm font-bold text-[var(--color-game-muted)]">{MOVEMENT_ACTIONS.find((action) => action.value === type)?.label} · คงเหลือ {balanceByItem[selectedItem.itemId] ?? 0} {selectedItem.unit}</p></div><GameButton type="button" variant="secondary" size="lg" onClick={closePanel} aria-label="ปิด">×</GameButton></div></header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {type === "ADJUSTMENT" && <fieldset><legend className="mb-2 font-black">ทิศทางการปรับ</legend><div className="grid grid-cols-2 gap-3"><ChoiceButton label="เพิ่มยอด" active={adjustmentDirection === "increase"} onClick={() => form.setValue("adjustmentDirection", "increase")} /><ChoiceButton label="ลดยอด" active={adjustmentDirection === "decrease"} onClick={() => form.setValue("adjustmentDirection", "decrease")} /></div></fieldset>}
          {needsFrom && <FormField label="ตำแหน่งต้นทาง"><select {...form.register("fromLocationId")}><option value="">เลือกต้นทาง</option>{locations.data?.filter((location) => location.isActive).map((location) => <option key={location.locationId} value={location.locationId}>{location.locationName}</option>)}</select></FormField>}
          {needsTo && <FormField label="ตำแหน่งปลายทาง"><select {...form.register("toLocationId")}><option value="">เลือกปลายทาง</option>{locations.data?.filter((location) => location.isActive).map((location) => <option key={location.locationId} value={location.locationId}>{location.locationName}</option>)}</select></FormField>}
          <QuantityStepper value={Number.isFinite(qty) ? qty : 0.01} unit={selectedItem.unit} onChange={(value) => form.setValue("qty", value, { shouldValidate: true })} />
          <FormField label="หมายเหตุ"><textarea className="min-h-24 resize-y" placeholder="ระบุเหตุผลหรือรายละเอียด (ถ้ามี)" {...form.register("note")} /></FormField>
          {save.error && <ErrorBox error={save.error} />}
        </div>
        <footer className="shrink-0 border-t border-[var(--color-game-border)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6"><ActionBar><GameButton type="button" variant="secondary" size="lg" className="flex-1" onClick={closePanel} disabled={save.isPending}>ยกเลิก</GameButton><GameButton type="submit" size="lg" className="flex-1" disabled={save.isPending}>{save.isPending ? "กำลังบันทึก..." : "ยืนยันรายการ"}</GameButton></ActionBar></footer>
      </form>
    </div>}</ViewportPortal>
  </div>;
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <SelectableTile selected={active} onClick={onClick} className="min-h-12 shrink-0 snap-start px-4">{label}</SelectableTile>;
}

function ChoiceButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <SelectableTile selected={active} onClick={onClick} className="min-h-12 px-3 text-center">{label}</SelectableTile>;
}
