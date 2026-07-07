"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState, ErrorBox, FilterBar, GameButtonLink, GameCard, PageHeader, SelectableTile, StatusBadge } from "@/components/page-kit";
import { get } from "@/lib/api";
import type { StockRequest } from "@/lib/types";

const statuses = ["", "PENDING", "APPROVED", "PARTIAL", "COMPLETED", "REJECTED", "CANCELLED"];

export default function RequestsPage() {
  const [status, setStatus] = useState("");
  const query = useQuery({ queryKey: ["requests", status], queryFn: () => get<StockRequest[]>(`/stock-requests${status ? `?status=${status}` : ""}`) });

  return <>
    <PageHeader eyebrow="Request history" title="คำขอเบิกสินค้า" description="ติดตามความคืบหน้าตั้งแต่รออนุมัติจนจ่ายครบ" />
    <FilterBar className="mb-5" label="กรองสถานะคำขอ">
      {statuses.map((v) => <SelectableTile key={v || "ALL"} selected={status === v} onClick={() => setStatus(v)} className="shrink-0 whitespace-nowrap text-sm">{v || "ทั้งหมด"}</SelectableTile>)}
    </FilterBar>
    {query.isError ? <ErrorBox error={query.error} /> : !query.data?.length ? <EmptyState title="ไม่พบคำขอ" description="ยังไม่มีคำขอในสถานะที่เลือก" /> : <div className="space-y-3">
      {query.data.map((v) => {
        const progress = v.requestedTotal ? Math.min(100, ((v.issuedTotal ?? 0) / v.requestedTotal) * 100) : 0;
        return <GameCard interactive key={v.requestId} className="p-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-black text-[var(--color-game-brown)]">{v.requestId}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-game-muted)]">{v.requestDate} · {v.itemCount ?? 0} รายการ · จ่าย {v.issuedTotal ?? 0}/{v.requestedTotal ?? 0}</p>
              <div className="mt-3 h-2 max-w-md bg-[var(--color-game-border)]"><div className="h-full bg-[var(--color-game-caramel)]" style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <StatusBadge tone={v.requestStatus === "COMPLETED" ? "success" : v.requestStatus === "REJECTED" ? "danger" : "warning"}>{v.requestStatus}</StatusBadge>
              <GameButtonLink href={`/inventory/requests/${v.requestId}`} size="sm">เปิดคำขอ</GameButtonLink>
              <GameButtonLink href={`/inventory/documents/internal-orders/${v.requestId}`} variant="secondary" size="sm">ดูเอกสาร</GameButtonLink>
            </div>
          </div>
        </GameCard>;
      })}
    </div>}
  </>;
}
