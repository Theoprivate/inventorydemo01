"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ItemImage } from "@/components/item-image";
import { EmptyState, ErrorBox, FormField, GameButtonLink, GameCard, GamePanel, PageHeader, StatusBadge } from "@/components/page-kit";
import { get } from "@/lib/api";
import { filterValidItems } from "@/lib/items";
import type { Category, Item, SessionUser } from "@/lib/types";

export default function ItemsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");
  const [success, setSuccess] = useState("");
  const items = useQuery({ queryKey: ["items"], queryFn: () => get<Item[]>("/items") });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => get<Category[]>("/categories") });
  const me = useQuery({ queryKey: ["me"], queryFn: () => get<SessionUser>("/auth/me"), retry: false });
  const canEdit = me.data?.role === "owner" || me.data?.role === "manager";

  useEffect(() => {
    const message = sessionStorage.getItem("item-config-success");
    if (message) { setSuccess(message); sessionStorage.removeItem("item-config-success"); }
  }, []);

  const validItems = useMemo(() => filterValidItems(items.data ?? []), [items.data]);
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return validItems.filter((item) => item.itemName.toLowerCase().includes(keyword) && (!category || item.categoryId === category) && (activeFilter === "all" || (activeFilter === "active" ? item.isActive : !item.isActive)));
  }, [validItems, search, category, activeFilter]);
  const hasFilters = search.trim() !== "" || category !== "" || activeFilter !== "all";

  return <>
    <PageHeader eyebrow="Master catalog" title="สินค้ากลาง" description={`ชื่อ หมวดหมู่ หน่วยและรูปที่ใช้ร่วมกันทุกสาขา · ${validItems.filter((item) => item.isActive).length} รายการที่เปิดใช้`} actions={canEdit ? <GameButtonLink href="/settings/items/new">+ เพิ่มสินค้ากลาง</GameButtonLink> : undefined} />
    <GamePanel className="mb-5 grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_14rem_13rem] lg:items-end">
      <FormField label="ค้นหาจากชื่อสินค้า"><input placeholder="เช่น หมูแดง" value={search} onChange={(event) => setSearch(event.target.value)} /></FormField>
      <FormField label="หมวดหมู่"><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">ทุกหมวดหมู่</option>{categories.data?.filter((value) => value.categoryId && value.categoryName).map((value, index) => <option key={`category-${value.categoryId}-${index}`} value={value.categoryId}>{value.categoryName}</option>)}</select></FormField>
      <FormField label="สถานะ"><select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)}><option value="all">ทั้งหมด</option><option value="active">เปิดใช้งาน</option><option value="inactive">ปิดใช้งาน</option></select></FormField>
    </GamePanel>
    <GamePanel className="mb-6 flex flex-col gap-3 bg-[var(--color-game-cream-active)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="page-market-header__eyebrow">SHARED BY EVERY BRANCH</p><p className="mt-1 text-sm font-bold">หน้านี้ยังไม่ได้กำหนดว่าสาขาใดใช้สินค้า ให้ไปเปิดใช้และตั้งค่าในสินค้าประจำสาขา</p></div><GameButtonLink href="/settings/store-items" variant="secondary">ไปสินค้าประจำสาขา →</GameButtonLink></GamePanel>
    {success && <GamePanel role="status" className="mb-5 p-4"><StatusBadge tone="success">SAVE COMPLETE</StatusBadge><p className="mt-2 font-black">{success}</p></GamePanel>}
    {items.isLoading ? <ItemsSkeleton /> : items.isError ? <ErrorBox error={items.error} retry={() => items.refetch()} /> : !validItems.length ? <EmptyState title="ยังไม่มีไอเทม" description="เพิ่มข้อมูลกลางของสินค้ารายการแรก" action={canEdit ? <GameButtonLink href="/settings/items/new">เพิ่มไอเทมแรก</GameButtonLink> : undefined} /> : !filtered.length ? <EmptyState title={hasFilters ? "ไม่พบไอเทมที่ค้นหา" : "ยังไม่มีไอเทม"} description={hasFilters ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : undefined} /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {filtered.map((item) => <GameCard key={item.itemId}><div className="grid grid-cols-[112px_minmax(0,1fr)]"><ItemImage src={item.imageUrl} itemName={item.itemName} className="h-full w-full border-r border-[var(--color-game-border)]" /><div className="min-w-0 p-4"><StatusBadge>{item.itemId}</StatusBadge><h2 className="mt-2 truncate text-lg font-black text-[var(--color-game-brown)]">{item.itemName}</h2><p className="mt-1 text-sm font-bold text-[var(--color-game-muted)]">{categories.data?.find((value) => value.categoryId === item.categoryId)?.categoryName || item.categoryId} · {item.unit}</p><StatusBadge className="mt-3" tone={item.isActive ? "success" : "danger"}>{item.isActive ? "ACTIVE" : "INACTIVE"}</StatusBadge></div></div>{canEdit && <div className="border-t border-[var(--color-game-border)] p-3"><GameButtonLink className="w-full" variant="secondary" href={`/settings/items/${encodeURIComponent(item.itemId)}/edit`}>แก้ไขไอเทม →</GameButtonLink></div>}</GameCard>)}
    </div>}
  </>;
}

function ItemsSkeleton() {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="กำลังโหลดไอเทม">{Array.from({ length: 6 }, (_, index) => <GameCard key={index} className="animate-pulse p-4"><div className="h-24 bg-[var(--color-game-cream-active)]"/><div className="mt-4 h-5 w-2/3 bg-[var(--color-game-border)]"/><div className="mt-2 h-4 w-1/2 bg-[var(--color-game-border)]"/></GameCard>)}</div>;
}
