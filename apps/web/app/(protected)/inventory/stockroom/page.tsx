"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActionBar, EmptyState, ErrorBox, GameButton, GameButtonLink, GameCard, PageHeader, StatusBadge } from "@/components/page-kit";
import { get, post } from "@/lib/api";
import type { StockRequest } from "@/lib/types";

export default function StockroomPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["stockroom"], queryFn: () => get<StockRequest[]>("/stock-requests?status=PENDING,APPROVED,PARTIAL") });
  const quick = useMutation({ mutationFn: (id: string) => post(`/stock-requests/${id}/quick-issue`), onSuccess: () => { client.invalidateQueries({ queryKey: ["stockroom"] }); client.invalidateQueries({ queryKey: ["requests"] }); client.invalidateQueries({ queryKey: ["balances"] }); } });
  return <><PageHeader eyebrow="Warehouse queue" title="ห้องคลัง" description="คิวจัดของเรียงจากคำขอเก่าสุด; จ่ายด่วนจะทำงานเฉพาะเมื่อ stock และ location ครบ" />
    {quick.error && <div className="mb-4"><ErrorBox error={quick.error} /></div>}
    {query.isError ? <ErrorBox error={query.error} /> : !query.data?.length ? <EmptyState title="ไม่มีคำขอค้างจัดของ" description="คำขอใหม่จะปรากฏที่นี่เมื่อพร้อมจัดของ" /> : <div className="grid gap-4 lg:grid-cols-2">{[...query.data].reverse().map((v) => <GameCard className="p-5" key={v.requestId}><div className="flex justify-between gap-3"><div><p className="font-black text-[var(--color-game-brown)]">{v.requestId}</p><p className="mt-1 text-sm font-semibold text-[var(--color-game-muted)]">{v.requestDate} · {v.itemCount ?? 0} รายการ</p></div><StatusBadge tone="warning">{v.requestStatus}</StatusBadge></div><p className="mt-4 text-sm text-[var(--color-game-ink)]">{v.note || "ไม่มีหมายเหตุ"}</p><ActionBar className="mt-5"><GameButtonLink href={`/inventory/requests/${v.requestId}`}>เปิดคำขอ</GameButtonLink><GameButton variant="secondary" disabled={quick.isPending} onClick={() => quick.mutate(v.requestId)}>จ่ายด่วนเต็มจำนวน</GameButton></ActionBar></GameCard>)}</div>}
  </>;
}
