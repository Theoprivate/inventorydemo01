"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ItemImage } from "@/components/item-image";
import { EmptyState, ErrorBox, FormField, GameButton, GameButtonLink, GameCard, GamePanel, PageHeader, SelectableTile, StatusBadge } from "@/components/page-kit";
import { get, put } from "@/lib/api";
import type { Branch, Category, Item, Location, SessionUser, StoreItem } from "@/lib/types";

export default function StoreItemsPage() {
  const client = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => get<SessionUser>("/auth/me") });
  const branches = useQuery({ queryKey: ["branches"], queryFn: () => get<Branch[]>("/branches") });
  const items = useQuery({ queryKey: ["items"], queryFn: () => get<Item[]>("/items") });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => get<Category[]>("/categories") });
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const locations = useQuery({
    queryKey: ["locations", selectedBranchId],
    queryFn: () => get<Location[]>(`/locations?branchId=${encodeURIComponent(selectedBranchId)}`),
    enabled: Boolean(selectedBranchId),
  });
  const store = useQuery({
    queryKey: ["store-items", selectedBranchId],
    queryFn: () => get<StoreItem[]>(`/store-items?branchId=${encodeURIComponent(selectedBranchId)}`),
    enabled: Boolean(selectedBranchId),
  });
  const [draft, setDraft] = useState<Record<string, StoreItem>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);

  useEffect(() => { if (me.data && !selectedBranchId) setSelectedBranchId(me.data.branchId); }, [me.data, selectedBranchId]);
  useEffect(() => { setDraft({}); }, [selectedBranchId]);
  useEffect(() => { if (store.data) setDraft(Object.fromEntries(store.data.map((value) => [value.itemId, value]))); }, [store.data]);
  const update = (itemId: string, patch: Partial<StoreItem>) => setDraft((current) => {
    const base: StoreItem = { storeItemId: "", branchId: selectedBranchId, itemId, minQty: 0, targetQty: 0, defaultLocationId: "", allowRequest: true, requireDailyCount: false, isActive: true };
    return { ...current, [itemId]: { ...base, ...(current[itemId] ?? {}), ...patch } };
  });
  const save = useMutation({
    mutationFn: () => put("/store-items/batch", { branchId: selectedBranchId, items: Object.values(draft) }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["store-items", selectedBranchId] }),
        client.invalidateQueries({ queryKey: ["requestable-items"] }),
      ]);
    },
  });
  const activeMasterItems = useMemo(() => (items.data ?? []).filter((value) => value.isActive), [items.data]);
  const filtered = useMemo(() => activeMasterItems.filter((value) => value.itemName.toLowerCase().includes(search.toLowerCase()) && (!category || value.categoryId === category) && (!selectedOnly || draft[value.itemId]?.isActive)), [activeMasterItems, search, category, selectedOnly, draft]);
  const selectedBranch = branches.data?.find((branch) => branch.branchId === selectedBranchId);
  const activeCount = activeMasterItems.filter((item) => draft[item.itemId]?.isActive).length;

  return <>
    <PageHeader eyebrow="Branch assortment" title="สินค้าประจำสาขา" description={`${selectedBranch?.branchName ?? "เลือกสาขา"} · เปิดใช้ ${activeCount} จาก ${activeMasterItems.length} รายการกลาง`} actions={<GameButton disabled={save.isPending || !selectedBranchId} onClick={() => save.mutate()}>{save.isPending ? "กำลังบันทึก..." : "บันทึกสาขานี้"}</GameButton>} />
    <GamePanel className="mb-6 flex flex-col gap-3 bg-[var(--color-game-cream-active)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="page-market-header__eyebrow">ONLY THIS BRANCH</p><p className="mt-1 text-sm font-bold">เปิดสินค้าที่สาขาใช้ แล้วกำหนดขั้นต่ำ เป้าหมาย ตำแหน่ง และสิทธิ์การเบิก</p></div>
      <GameButtonLink href="/settings/items" variant="secondary">← กลับสินค้ากลาง</GameButtonLink>
    </GamePanel>
    <GamePanel className="mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <FormField label="สาขาที่กำลังตั้งค่า"><select value={selectedBranchId} disabled={me.data?.role !== "owner"} onChange={(event) => setSelectedBranchId(event.target.value)}>{branches.data?.filter((branch) => branch.isActive).map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.branchName}</option>)}</select></FormField>
      <FormField label="ค้นหาสินค้า"><input placeholder="ค้นหาสินค้า" value={search} onChange={(event) => setSearch(event.target.value)} /></FormField>
      <FormField label="หมวดหมู่"><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">ทุกหมวด</option>{categories.data?.map((value, index) => <option key={`category-${value.categoryId || "empty"}-${index}`} value={value.categoryId}>{value.categoryName}</option>)}</select></FormField>
      <SelectableTile selected={selectedOnly} onClick={() => setSelectedOnly((value) => !value)} className="min-h-11">แสดงเฉพาะที่เปิดใช้</SelectableTile>
    </GamePanel>
    {save.error && <div className="mb-5"><ErrorBox error={save.error} /></div>}
    {store.isLoading ? <GamePanel className="animate-pulse p-8"><div className="h-6 w-48 bg-[var(--color-game-border)]"/><div className="mt-4 h-32 bg-[var(--color-game-cream-active)]"/></GamePanel> : store.isError ? <ErrorBox error={store.error} retry={() => store.refetch()} /> : !filtered.length ? <EmptyState title="ไม่พบสินค้าประจำสาขา" description={selectedOnly ? "ลองปิดตัวกรองเฉพาะที่เปิดใช้" : "ลองเปลี่ยนคำค้นหาหรือตัวกรอง"} /> : <div className="grid gap-4 md:grid-cols-2">{filtered.map((item, itemIndex) => {
      const value = draft[item.itemId];
      return <GameCard className={value?.isActive ? "" : "opacity-70"} key={`store-item-${item.itemId || "empty"}-${itemIndex}`}>
        <div className="grid grid-cols-[96px_1fr] border-b border-[var(--color-game-border)]">
          <ItemImage itemName={item.itemName} src={item.imageUrl} className="h-full w-full border-r border-[var(--color-game-border)]" />
          <div className="p-3"><div className="flex justify-between gap-2"><div><p className="font-black text-[var(--color-game-brown)]">{item.itemName}</p><p className="text-xs font-bold text-[var(--color-game-muted)]">{item.unit} · {item.itemId}</p><StatusBadge className="mt-2" tone={value?.isActive ? "success" : "neutral"}>{value?.isActive ? "สาขานี้ใช้" : "ยังไม่เปิดใช้"}</StatusBadge></div><input aria-label={`เปิดใช้ ${item.itemName}`} type="checkbox" checked={value?.isActive ?? false} onChange={(event) => update(item.itemId, { isActive: event.target.checked })} /></div></div>
        </div>
        {value?.isActive && <div className="grid gap-3 p-3 sm:grid-cols-2">
          <FormField label="ขั้นต่ำ"><input type="number" min="0" value={value.minQty} onChange={(event) => update(item.itemId, { minQty: Number(event.target.value) })} /></FormField>
          <FormField label="เป้าหมาย"><input type="number" min="0" value={value.targetQty} onChange={(event) => update(item.itemId, { targetQty: Number(event.target.value) })} /></FormField>
          <FormField className="sm:col-span-2" label="ตำแหน่งปลายทาง"><select value={value.defaultLocationId} onChange={(event) => update(item.itemId, { defaultLocationId: event.target.value })}><option value="">ยังไม่กำหนด</option>{locations.data?.filter((location) => location.isActive).map((location, index) => <option key={`location-${location.locationId || "empty"}-${index}`} value={location.locationId}>{location.locationName}</option>)}</select></FormField>
          <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={value.allowRequest} onChange={(event) => update(item.itemId, { allowRequest: event.target.checked })} /> อนุญาตให้เบิก</label>
          <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={value.requireDailyCount} onChange={(event) => update(item.itemId, { requireDailyCount: event.target.checked })} /> ต้องนับทุกวัน</label>
        </div>}
      </GameCard>;
    })}</div>}
  </>;
}
