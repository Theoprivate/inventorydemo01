"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StockCountPrintableDocument, roundLabel, stockCountRounds } from "@/components/documents/stock-count-printable-document";
import { EmptyState, ErrorBox, FormField, GameButton, GamePanel, PageHeader, StatusBadge } from "@/components/page-kit";
import { get, post } from "@/lib/api";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { filterValidItems } from "@/lib/items";
import { paginateCountItemsForPrint } from "@/lib/stock-count-paper";
import type { Category, Item, Location, SessionUser, StockCount, StoreItem } from "@/lib/types";

const A4_PREVIEW_WIDTH_PX = 718;
const A4_PREVIEW_HEIGHT_PX = 1047;
const preferredCategoryNames = ["วัตถุดิบ", "เครื่องปรุง", "บรรจุภัณฑ์", "เครื่องดื่ม", "เชื้อเพลิง", "ของใช้สิ้นเปลือง"];

type SelectablePaperItem = Item & {
  categoryName: string;
  defaultLocationId: string;
  requireDailyCount: boolean;
};

export default function PaperCountPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => get<SessionUser>("/auth/me") });
  const locations = useQuery({ queryKey: ["locations"], queryFn: () => get<Location[]>("/locations") });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => get<Category[]>("/categories") });
  const items = useQuery({ queryKey: ["items"], queryFn: () => get<Item[]>("/items") });
  const store = useQuery({ queryKey: ["store-items"], queryFn: () => get<StoreItem[]>("/store-items") });
  const [locationId, setLocationId] = useState("");
  const [countRound, setCountRound] = useState<typeof stockCountRounds[number]>("CLOSING");
  const [categoryId, setCategoryId] = useState("");
  const [requireDailyCountOnly, setRequireDailyCountOnly] = useState(true);
  const [sortBy, setSortBy] = useState<"CATEGORY" | "LOCATION">("CATEGORY");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [created, setCreated] = useState<StockCount | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [printFrameSrc, setPrintFrameSrc] = useState("");

  const validItems = useMemo(() => filterValidItems(items.data ?? []), [items.data]);
  const allPaperItems = useMemo<SelectablePaperItem[]>(() => {
    const activeStore = (store.data ?? []).filter((setting) => setting.isActive && (!requireDailyCountOnly || setting.requireDailyCount));
    return activeStore.flatMap((setting) => {
      const item = validItems.find((candidate) => candidate.itemId === setting.itemId && candidate.isActive);
      if (!item) return [];
      const category = categories.data?.find((candidate) => candidate.categoryId === item.categoryId);
      return [{ ...item, categoryName: category?.categoryName ?? "", requireDailyCount: setting.requireDailyCount, defaultLocationId: setting.defaultLocationId }];
    }).sort((a, b) => sortBy === "LOCATION" ? a.defaultLocationId.localeCompare(b.defaultLocationId) || a.itemName.localeCompare(b.itemName) : a.categoryName.localeCompare(b.categoryName) || a.itemName.localeCompare(b.itemName));
  }, [categories.data, requireDailyCountOnly, sortBy, store.data, validItems]);

  const selectableItems = useMemo<SelectablePaperItem[]>(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return allPaperItems.filter((item) => {
      if (categoryId && item.categoryId !== categoryId) return false;
      if (normalizedSearch) {
        const searchable = `${item.itemId} ${item.itemName} ${item.categoryName}`.toLowerCase();
        if (!searchable.includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [allPaperItems, categoryId, search]);

  const selectedItems = useMemo(() => allPaperItems.filter((item) => selected.has(item.itemId)), [allPaperItems, selected]);
  const selectedByCategory = useMemo(() => {
    const groups = new Map<string, SelectablePaperItem[]>();
    for (const item of selectedItems) {
      const key = item.categoryName || "ไม่ระบุหมวดหมู่";
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.entries()];
  }, [selectedItems]);

  const categoryChips = useMemo(() => {
    const active = (categories.data ?? []).filter((category) => category.isActive);
    return active.sort((a, b) => {
      const aIndex = preferredCategoryNames.indexOf(a.categoryName);
      const bIndex = preferredCategoryNames.indexOf(b.categoryName);
      return (aIndex === -1 ? preferredCategoryNames.length : aIndex) - (bIndex === -1 ? preferredCategoryNames.length : bIndex) || a.categoryName.localeCompare(b.categoryName);
    });
  }, [categories.data]);

  const createPaper = useMutation({
    mutationFn: () => post<StockCount>("/stock-counts/paper", { locationId, countRound, categoryId: categoryId || undefined, requireDailyCountOnly, sortBy, itemIds: [...selected] }),
    onSuccess: async (value) => {
      const hydrated = value.items?.length ? value : await get<StockCount>(`/stock-counts/${value.countId}`);
      setCreated(hydrated);
      setIsSummaryOpen(true);
    },
  });

  const toggle = (itemId: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    return next;
  });
  const selectAll = () => setSelected(new Set(selectableItems.map((item) => item.itemId)));
  const clearSelected = () => setSelected(new Set());
  const pages = created?.items ? paginateCountItemsForPrint(created.items) : [];
  const printHref = created ? `/inventory/count/paper/print?id=${encodeURIComponent(created.countId)}` : "";
  const printDocument = () => {
    if (!created) return;
    const separator = printHref.includes("?") ? "&" : "?";
    setPrintFrameSrc(`${printHref}${separator}printAt=${Date.now()}`);
  };

  useEffect(() => {
    if (!isPreviewOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPreviewOpen]);

  const renderPanel = () => (
    <PreviewPanel
      created={created}
      createError={createPaper.error}
      isCreating={createPaper.isPending}
      locationId={locationId}
      selectedByCategory={selectedByCategory}
      selectedCount={selected.size}
      totalCount={allPaperItems.length}
      onClearSelected={clearSelected}
      onCreate={() => createPaper.mutate()}
      onPreview={() => setIsPreviewOpen(true)}
      onPrint={printDocument}
      onRemoveSelected={toggle}
    />
  );

  return <div className="min-w-0 overflow-x-clip">
    {printFrameSrc && (
      <iframe
        key={printFrameSrc}
        title="print stock count document"
        src={printFrameSrc}
        className="no-print pointer-events-none fixed left-0 top-0 h-0 w-0 border-0 opacity-0"
        aria-hidden="true"
        tabIndex={-1}
      />
    )}
    <div className="screen-only">
      <PageHeader eyebrow="Stock Count · Paper OCR" title="พิมพ์ใบนับสต๊อก" description="สร้างเอกสาร A4 สำหรับเดินนับสินค้า แล้วนำกลับมาสแกน OCR" actions={<Link className="game-button game-button--secondary game-button--md" href="/inventory/count/scan">ไปหน้าสแกน</Link>} />
      <nav className="mb-5 flex flex-wrap gap-2">
        <Link className="game-button game-button--secondary game-button--md" href="/inventory/count">นับในระบบ</Link>
        <span className="game-button game-button--primary game-button--md">พิมพ์ใบนับ</span>
        <Link className="game-button game-button--secondary game-button--md" href="/inventory/count/scan">สแกนใบนับ</Link>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div className="min-w-0 pb-28 lg:pb-0">
          <GamePanel className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="สาขา"><input value={me.data?.branchName ?? ""} disabled /></FormField>
            <FormField label="ตำแหน่งจัดเก็บ" required><select value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">เลือกตำแหน่ง</option>{locations.data?.filter((location) => location.isActive).map((location) => <option key={location.locationId} value={location.locationId}>{location.locationName}</option>)}</select></FormField>
            <FormField label="รอบนับ"><select value={countRound} onChange={(event) => setCountRound(event.target.value as typeof countRound)}>{stockCountRounds.map((round) => <option key={round} value={round}>{roundLabel(round)}</option>)}</select></FormField>
            <FormField className="md:col-span-2" label="ค้นหาสินค้า"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ชื่อสินค้า, รหัส, หมวดหมู่" /></FormField>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={requireDailyCountOnly} onChange={(event) => setRequireDailyCountOnly(event.target.checked)} /> แสดงเฉพาะ Require Daily Count</label>
            <FormField label="เรียงรายการ"><select value={sortBy} onChange={(event) => setSortBy(event.target.value as "CATEGORY" | "LOCATION")}><option value="CATEGORY">ตามหมวดหมู่</option><option value="LOCATION">ตามตำแหน่งจัดเก็บ</option></select></FormField>
            <div className="md:col-span-2 xl:col-span-4">
              <p className="mb-2 text-xs font-black text-[var(--color-game-muted)]">หมวดหมู่</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setCategoryId("")} className={`rounded-full border px-3 py-2 text-sm font-black ${!categoryId ? "border-[#71331f] bg-[#fff0ce] text-[#71331f]" : "border-[var(--color-game-border)] bg-[var(--color-game-cream)] text-[var(--color-game-muted)]"}`}>ทั้งหมด</button>
                {categoryChips.map((category) => <button key={category.categoryId} type="button" onClick={() => setCategoryId(category.categoryId)} className={`rounded-full border px-3 py-2 text-sm font-black ${categoryId === category.categoryId ? "border-[#71331f] bg-[#fff0ce] text-[#71331f]" : "border-[var(--color-game-border)] bg-[var(--color-game-cream)] text-[var(--color-game-muted)]"}`}>{category.categoryName}</button>)}
              </div>
            </div>
          </GamePanel>

          <section className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-[var(--color-game-brown)]">รายการสินค้า</h2>
              <div className="flex flex-wrap items-center gap-2">
                <GameButton variant="secondary" onClick={selectAll} disabled={!selectableItems.length}>เลือกสินค้าทั้งหมด</GameButton>
                <StatusBadge tone="info">เลือกแล้ว {selected.size} / {allPaperItems.length}</StatusBadge>
              </div>
            </div>
            {!selectableItems.length ? <EmptyState title="ไม่มีรายการที่ตรงเงื่อนไข" description="ลองเปลี่ยนคำค้น หมวดหมู่ หรือปิดตัวกรอง Require Daily Count" /> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{selectableItems.map((item) => {
              const isSelected = selected.has(item.itemId);
              return <button key={item.itemId} type="button" onClick={() => toggle(item.itemId)} aria-pressed={isSelected} className={`relative rounded-[7px] border p-3 pl-11 text-left shadow-[2px_3px_0_#d0aa74] transition ${isSelected ? "border-2 border-[#71331f] bg-[#fff0ce]" : "border-[var(--color-game-border)] bg-[var(--color-game-cream)]"}`}>
                <span className={`selection-indicator no-print absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-[6px] border-2 text-sm font-black ${isSelected ? "border-[#71331f] bg-[#71331f] text-white" : "border-[#b88b5b] bg-white text-transparent"}`} aria-hidden="true">✓</span>
                <p className="text-xs font-bold text-[var(--color-game-muted)]">{item.categoryName || item.itemId}</p>
                <p className="mt-1 font-black text-[var(--color-game-brown)]">{item.itemName}</p>
                <p className="mt-1 text-sm text-[var(--color-game-muted)]">{item.unit} · {item.requireDailyCount ? "Daily count" : "Optional"}</p>
                {isSelected && <span className="mt-2 inline-flex rounded-full bg-[#71331f] px-2 py-1 text-xs font-black text-white">เลือกแล้ว</span>}
              </button>;
            })}</div>}
          </section>
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          {renderPanel()}
        </aside>
      </div>

      <button type="button" onClick={() => setIsSummaryOpen(true)} className="no-print floating-button fixed inset-x-4 bottom-4 z-40 rounded-[7px] border-2 border-[#71331f] bg-[#71331f] px-4 py-3 text-sm font-black text-white shadow-[3px_4px_0_#d0aa74] lg:hidden">
        รายการที่เลือก / สรุปเอกสาร · {selected.size} รายการ
      </button>

      {isSummaryOpen && <div className="fixed inset-0 z-50 bg-black/35 lg:hidden" role="dialog" aria-modal="true" aria-label="สรุปใบนับและรายการที่เลือก">
        <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[8px] bg-[#fff8e8] p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-[var(--color-game-brown)]">สรุปเอกสาร / รายการที่เลือก</h2>
            <GameButton variant="ghost" size="sm" onClick={() => setIsSummaryOpen(false)}>ปิด</GameButton>
          </div>
          {renderPanel()}
        </div>
      </div>}

      {isPreviewOpen && created && <PreviewModal count={created} pages={pages} onClose={() => setIsPreviewOpen(false)} onPrint={printDocument} />}
    </div>
  </div>;
}

function PreviewPanel({
  created,
  createError,
  isCreating,
  locationId,
  selectedByCategory,
  selectedCount,
  totalCount,
  onClearSelected,
  onCreate,
  onPreview,
  onPrint,
  onRemoveSelected,
}: {
  created: StockCount | null;
  createError: unknown;
  isCreating: boolean;
  locationId: string;
  selectedByCategory: Array<[string, SelectablePaperItem[]]>;
  selectedCount: number;
  totalCount: number;
  onClearSelected: () => void;
  onCreate: () => void;
  onPreview: () => void;
  onPrint: () => void;
  onRemoveSelected: (itemId: string) => void;
}) {
  return <GamePanel className="space-y-4 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black text-[var(--color-game-muted)]">รายการที่เลือก</p>
        <h2 className="text-xl font-black text-[var(--color-game-brown)]">เลือกแล้ว {selectedCount} / {totalCount} รายการ</h2>
      </div>
      <StatusBadge tone={selectedCount ? "success" : "neutral"}>{selectedCount ? "พร้อมสร้าง" : "ยังไม่เลือกสินค้า"}</StatusBadge>
    </div>

    <div className="flex flex-wrap gap-2">
      <GameButton disabled={!locationId || !selectedCount || isCreating} onClick={onCreate}>{isCreating ? "กำลังสร้าง..." : "สร้างใบนับ"}</GameButton>
      <GameButton variant="secondary" disabled={!created} onClick={onPreview}>ดูตัวอย่าง</GameButton>
      <GameButton variant="secondary" disabled={!created} onClick={onPrint}>พิมพ์เอกสาร</GameButton>
      <GameButton variant="ghost" disabled={!selectedCount} onClick={onClearSelected}>ล้างรายการที่เลือก</GameButton>
    </div>

    <p className="rounded-[7px] border border-[#e6c28d] bg-[#fff8e8] p-3 text-xs font-bold leading-5 text-[var(--color-game-muted)]">
      ก่อนพิมพ์เลือกกระดาษ A4, Scale 100%, ปิด Headers and footers และเปิด Background graphics ถ้าต้องการสีพื้น/เส้นตารางครบ
    </p>

    {createError ? <ErrorBox error={createError} /> : null}

    {created && <div className="rounded-[7px] border border-[var(--color-game-border)] bg-[#fff0ce] p-3">
      <p className="text-xs font-black text-[var(--color-game-muted)]">สร้างใบนับแล้ว</p>
      <p className="mt-1 text-lg font-black text-[var(--color-game-brown)]">{created.documentCode || created.countId}</p>
      <p className="mt-1 text-sm font-bold text-[var(--color-game-muted)]">{created.items?.length ?? 0} รายการ</p>
      <Link className="mt-2 inline-block font-bold underline" href={`/inventory/count/${created.countId}`}>เปิดรายละเอียด</Link>
    </div>}

    <section className="space-y-3">
      <h3 className="font-black text-[var(--color-game-brown)]">สรุปรายการที่เลือก</h3>
      {!selectedByCategory.length ? <EmptyState title="ยังไม่ได้เลือกสินค้า" description="เลือกสินค้าจากคอลัมน์ซ้ายเพื่อสร้างใบนับ" /> : <div className="space-y-3">
        {selectedByCategory.map(([categoryName, groupItems]) => <div key={categoryName} className="rounded-[7px] border border-[var(--color-game-border)] bg-[var(--color-game-cream)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-black text-[var(--color-game-brown)]">{categoryName}</p>
            <StatusBadge tone="info">{groupItems.length} รายการ</StatusBadge>
          </div>
          <div className="space-y-2">
            {groupItems.map((item) => <div key={item.itemId} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate font-bold text-[var(--color-game-ink)]">{item.itemName}</span>
              <button type="button" onClick={() => onRemoveSelected(item.itemId)} className="shrink-0 font-black text-[#9a2d1f] underline">ลบ</button>
            </div>)}
          </div>
        </div>)}
      </div>}
    </section>
  </GamePanel>;
}

function PreviewModal({ count, pages, onClose, onPrint }: { count: StockCount; pages: NonNullable<StockCount["items"]>[]; onClose: () => void; onPrint: () => void }) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [zoomMode, setZoomMode] = useState<"FIT_PAGE" | "FIT_WIDTH" | "CUSTOM">("FIT_PAGE");
  const [customScale, setCustomScale] = useState(1);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => lockBodyScroll(document.body), []);

  useEffect(() => {
    const update = () => {
      const rect = bodyRef.current?.getBoundingClientRect();
      setViewport({ width: rect?.width ?? window.innerWidth, height: rect?.height ?? window.innerHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const fitWidthScale = viewport.width ? Math.min(Math.max((viewport.width - 48) / A4_PREVIEW_WIDTH_PX, 0.5), 1.5) : 0.8;
  const fitPageScale = viewport.width && viewport.height ? Math.min(Math.max((viewport.width - 48) / A4_PREVIEW_WIDTH_PX, 0.5), Math.max((viewport.height - 48) / A4_PREVIEW_HEIGHT_PX, 0.5), 1.5) : 0.7;
  const scale = zoomMode === "FIT_WIDTH" ? fitWidthScale : zoomMode === "FIT_PAGE" ? fitPageScale : customScale;
  const setActualSize = () => {
    setZoomMode("CUSTOM");
    setCustomScale(1);
  };
  const zoomBy = (delta: number) => {
    setZoomMode("CUSTOM");
    setCustomScale((value) => Math.min(1.5, Math.max(0.5, Number((value + delta).toFixed(2)))));
  };

  return <>
    <div className="preview-overlay fixed inset-0 z-[1000] bg-black/55" onMouseDown={onClose} aria-hidden="true" />
    <div className="preview-modal fixed inset-0 z-[1001] flex flex-col overflow-hidden bg-[#f7efe1] shadow-2xl sm:inset-x-[4vw] sm:inset-y-[4vh] sm:rounded-[12px]" role="dialog" aria-modal="true" aria-label="ตัวอย่างใบนับสต๊อก">
      <header className="preview-header no-print modal-header flex items-center justify-between gap-3 border-b border-[var(--color-game-border)] bg-[var(--color-game-cream)] px-4 py-3">
        <h2 className="text-lg font-black text-[var(--color-game-brown)]">ตัวอย่างใบนับสต๊อก</h2>
        <button type="button" onClick={onClose} className="rounded-[6px] border border-[var(--color-game-border)] bg-white px-3 py-2 font-black text-[var(--color-game-brown)]" aria-label="ปิดตัวอย่าง">X</button>
      </header>
      <div className="preview-toolbar no-print toolbar flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-game-border)] bg-[#fff8e8] px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <GameButton size="sm" variant={zoomMode === "FIT_PAGE" ? "primary" : "secondary"} onClick={() => setZoomMode("FIT_PAGE")}>Fit page</GameButton>
          <GameButton size="sm" variant={zoomMode === "FIT_WIDTH" ? "primary" : "secondary"} onClick={() => setZoomMode("FIT_WIDTH")}>Fit width</GameButton>
          <GameButton size="sm" variant={zoomMode === "CUSTOM" && customScale === 1 ? "primary" : "secondary"} onClick={setActualSize}>100%</GameButton>
          <GameButton size="sm" variant="secondary" onClick={() => zoomBy(-0.1)}>Zoom -</GameButton>
          <GameButton size="sm" variant="secondary" onClick={() => zoomBy(0.1)}>Zoom +</GameButton>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone="info">{Math.round(scale * 100)}%</StatusBadge>
          <GameButton size="sm" onClick={onPrint}>Print</GameButton>
          <GameButton size="sm" variant="secondary" onClick={onClose}>Close</GameButton>
        </div>
      </div>
      <div ref={bodyRef} className="preview-body document-preview-body min-h-0 flex-1 overflow-auto">
        <div
          className="preview-canvas document-preview-stage"
          style={{
            minHeight: A4_PREVIEW_HEIGHT_PX * Math.max(pages.length, 1) * scale + 96,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: 32,
          }}
        >
          <div
            className="preview-page-wrapper document-preview-scaled"
            style={{
              width: A4_PREVIEW_WIDTH_PX,
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              background: "white",
              boxShadow: "0 12px 28px rgba(0,0,0,.18)",
            }}
          >
            <StockCountPrintableDocument count={count} pages={pages} className="stock-count-print-document stock-count-preview-document" />
          </div>
        </div>
      </div>
      <footer className="preview-footer no-print modal-footer border-t border-[var(--color-game-border)] bg-[var(--color-game-cream)] px-4 py-3">
        <p className="text-xs font-bold text-[var(--color-game-muted)]">ก่อนพิมพ์: ใช้กระดาษ A4, Scale 100%, ปิด Headers and footers และเปิด Background graphics ถ้าต้องการเส้น/สีครบ</p>
      </footer>
    </div>
  </>;
}
