"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { ActionBar, EmptyState, ErrorBox, FormField, GameButton, GamePanel, PageHeader, SelectableTile } from "@/components/page-kit";
import { StockCountCard } from "@/components/stock-count-card";
import { get, post } from "@/lib/api";
import { filterValidItems } from "@/lib/items";
import { buildStockCountPayload } from "@/lib/stock-count-payload";
import type { Item, Location, StockBalance, StoreItem } from "@/lib/types";

const rounds = ["OPENING", "MIDDAY", "CLOSING", "ADHOC"] as const;
const schema = z.object({
  locationId: z.string().min(1),
  countRound: z.enum(rounds),
  note: z.string(),
  items: z.array(z.object({ itemId: z.string(), itemName: z.string(), unit: z.string(), systemQty: z.number(), countedQty: z.coerce.number().min(0), note: z.string() })).min(1),
});
type Form = z.infer<typeof schema>;

export default function CountPage() {
  const client = useQueryClient();
  const locations = useQuery({ queryKey: ["locations"], queryFn: () => get<Location[]>("/locations") });
  const items = useQuery({ queryKey: ["items"], queryFn: () => get<Item[]>("/items") });
  const store = useQuery({ queryKey: ["store-items"], queryFn: () => get<StoreItem[]>("/store-items") });
  const balances = useQuery({ queryKey: ["balances"], queryFn: () => get<StockBalance[]>("/stock-balances") });
  const form = useForm<Form>({ defaultValues: { locationId: "", countRound: "CLOSING", note: "", items: [] } });
  const fields = useFieldArray({ control: form.control, name: "items" });
  const locationId = form.watch("locationId");
  const countRound = form.watch("countRound");
  const watched = form.watch("items");
  const validItems = useMemo(() => filterValidItems(items.data ?? []), [items.data]);

  useEffect(() => {
    if (!store.data || !locationId) return;
    fields.replace(store.data.filter((setting) => setting.isActive && setting.requireDailyCount).flatMap((setting) => {
      const item = validItems.find((candidate) => candidate.itemId === setting.itemId && candidate.isActive);
      if (!item) return [];
      const systemQty = balances.data?.find((balance) => balance.locationId === locationId && balance.itemId === item.itemId)?.currentQty ?? 0;
      return [{ itemId: item.itemId, itemName: item.itemName, unit: item.unit, systemQty, countedQty: systemQty, note: "" }];
    }));
  }, [locationId, validItems, store.data, balances.data]);

  const summary = useMemo(() => ({
    equal: watched.filter((value) => value.countedQty === value.systemQty).length,
    over: watched.filter((value) => value.countedQty > value.systemQty).length,
    short: watched.filter((value) => value.countedQty < value.systemQty).length,
  }), [watched]);

  const save = useMutation({
    mutationFn: ({ values, status }: { values: Form; status: "DRAFT" | "COMPLETED" }) => post("/stock-counts", buildStockCountPayload(values, status)),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["balances"] }),
        client.invalidateQueries({ queryKey: ["counts"] }),
      ]);
    },
  });
  const submit = (status: "DRAFT" | "COMPLETED") => form.handleSubmit((values) => {
    const parsed = schema.parse(values);
    if (status === "COMPLETED" && !window.confirm(`ยืนยันผล: ตรง ${summary.equal}, เกิน ${summary.over}, ขาด ${summary.short}`)) return;
    save.mutate({ values: parsed, status });
  })();

  return <div className="min-w-0 overflow-x-clip">
    <PageHeader eyebrow="Stock Count · Multi Item" title="นับสต๊อก" description="เลือกตำแหน่ง แล้วกรอกยอดจริงจากการ์ดสินค้าในหน้าเดียว" />

    <section className="border-b-2 border-[var(--color-game-border-strong)] pb-6">
      <p className="page-market-header__eyebrow">COUNT SETUP</p>
      <h2 className="mb-3 mt-1 text-xl font-black text-[var(--color-game-brown)]">ตำแหน่งที่นับ</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">{locations.data?.filter((location) => location.isActive).map((location) => <ChoiceCard key={location.locationId} label={location.locationName} code={location.locationType} active={locationId === location.locationId} onClick={() => form.setValue("locationId", location.locationId)} />)}</div>
      <h2 className="mb-3 mt-6 text-xl font-black text-[var(--color-game-brown)]">รอบการนับ</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{rounds.map((round) => <ChoiceCard key={round} label={roundLabel(round)} code={round} active={countRound === round} onClick={() => form.setValue("countRound", round)} />)}</div>
      <FormField className="mt-5 max-w-3xl" label="หมายเหตุทั้งรอบ"><input placeholder="รายละเอียดรอบการนับ (ถ้ามี)" {...form.register("note")} /></FormField>
    </section>

    <section className="py-6">
      <div className="mb-5 grid grid-cols-3 gap-3">{[["ตรงกัน", summary.equal], ["เกิน", summary.over], ["ขาด", summary.short]].map(([label, value]) => <GamePanel className="p-3 text-center" key={String(label)}><p className="text-xs font-black text-[var(--color-game-muted)]">{label}</p><p className="mt-1 text-2xl font-black text-[var(--color-game-brown)]">{value}</p></GamePanel>)}</div>
      {!locationId ? <EmptyState title="เลือกตำแหน่งเพื่อเริ่มนับ" description="เลือกรายการตำแหน่งจากส่วนตั้งค่าด้านบน" /> : !fields.fields.length ? <EmptyState title="ไม่มีรายการที่ต้องนับ" description="ยังไม่มีรายการที่ตั้งค่า Require Daily Count" /> : <div className="grid min-w-0 gap-5 xl:grid-cols-2">{fields.fields.map((field, index) => {
        const item = validItems.find((candidate) => candidate.itemId === field.itemId);
        if (!item) return null;
        return <StockCountCard key={field.id} item={item} systemQty={field.systemQty} countedQty={Number(watched[index]?.countedQty ?? 0)} note={watched[index]?.note ?? ""} onCountedQtyChange={(value) => form.setValue(`items.${index}.countedQty`, value, { shouldDirty: true, shouldValidate: true })} onNoteChange={(value) => form.setValue(`items.${index}.note`, value, { shouldDirty: true })} />;
      })}</div>}
      {save.error && <div className="mt-5"><ErrorBox error={save.error} /></div>}
      <ActionBar sticky className="bottom-[4.5rem] mt-6 lg:bottom-4"><GameButton variant="secondary" size="lg" className="flex-1" disabled={save.isPending || !fields.fields.length} onClick={() => submit("DRAFT")}>บันทึก Draft</GameButton><GameButton size="lg" className="flex-1" disabled={save.isPending || !fields.fields.length} onClick={() => submit("COMPLETED")}>{save.isPending ? "กำลังบันทึก..." : "บันทึกทั้งหมด"}</GameButton></ActionBar>
    </section>
  </div>;
}

function ChoiceCard({ label, code, active, onClick }: { label: string; code: string; active: boolean; onClick: () => void }) {
  return <SelectableTile selected={active} onClick={onClick} className="min-h-20 min-w-0 p-3"><span className="block truncate font-black">{label}</span><span className="mt-1 block truncate font-mono text-[9px] font-black tracking-wider opacity-60">{code}</span></SelectableTile>;
}

function roundLabel(round: typeof rounds[number]) {
  return ({ OPENING: "เปิดร้าน", MIDDAY: "กลางวัน", CLOSING: "ปิดร้าน", ADHOC: "นับพิเศษ" } as const)[round];
}
