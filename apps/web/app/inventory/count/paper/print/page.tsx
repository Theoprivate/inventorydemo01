"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { StockCountPrintableDocument } from "@/components/documents/stock-count-printable-document";
import { ErrorBox } from "@/components/page-kit";
import { get } from "@/lib/api";
import { paginateCountItems } from "@/lib/stock-count-paper";
import type { StockCount } from "@/lib/types";

const PRINT_ROWS_PER_PAGE = 18;

export default function PaperCountPrintPage() {
  return <Suspense fallback={<PrintState text="กำลังเตรียมเอกสาร..." />}>
    <PaperCountPrintContent />
  </Suspense>;
}

function PaperCountPrintContent() {
  const searchParams = useSearchParams();
  const countId = searchParams.get("id") ?? "";
  const count = useQuery({
    queryKey: ["stock-count-print", countId],
    queryFn: () => get<StockCount>(`/stock-counts/${countId}`),
    enabled: Boolean(countId),
  });
  const pages = count.data?.items ? paginateCountItems(count.data.items, PRINT_ROWS_PER_PAGE) : [];

  useEffect(() => {
    if (!count.data?.items?.length) return;
    let cancelled = false;
    const printWhenReady = async () => {
      await document.fonts?.ready.catch(() => undefined);
      const images = Array.from(document.images);
      await Promise.all(images.map((image) => image.complete ? undefined : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })));
      if (!cancelled) window.print();
    };
    const timeout = window.setTimeout(() => { void printWhenReady(); }, 250);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [count.data]);

  if (!countId) return <PrintState text="ไม่พบรหัสใบนับสำหรับพิมพ์" />;
  if (count.isLoading) return <PrintState text="กำลังเตรียมเอกสาร..." />;
  if (count.error) return <div className="no-print min-h-screen bg-white p-6"><ErrorBox error={count.error} /></div>;
  if (!count.data?.items?.length) return <PrintState text="เอกสารนี้ไม่มีรายการสินค้า" />;

  return <main className="print-only-document bg-white">
    <StockCountPrintableDocument count={count.data} pages={pages} className="stock-count-print-document" />
  </main>;
}

function PrintState({ text }: { text: string }) {
  return <main className="no-print flex min-h-screen items-center justify-center bg-white p-6 text-center font-bold text-[#4a241e]">{text}</main>;
}
