"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Badge, Empty, ErrorBox, PageHeader } from "@/components/page-kit";
import { get, post } from "@/lib/api";
import type { StockRequest } from "@/lib/types";

export default function StockroomPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["stockroom"], queryFn: () => get<StockRequest[]>("/stock-requests?status=PENDING,APPROVED,PARTIAL") });
  const quick = useMutation({ mutationFn: (id: string) => post(`/stock-requests/${id}/quick-issue`), onSuccess: () => { client.invalidateQueries({ queryKey: ["stockroom"] }); client.invalidateQueries({ queryKey: ["requests"] }); client.invalidateQueries({ queryKey: ["balances"] }); } });
  return <><PageHeader eyebrow="Warehouse queue" title="ห้องคลัง" description="คิวจัดของเรียงจากคำขอเก่าสุด; จ่ายด่วนจะทำงานเฉพาะเมื่อ stock และ location ครบ" />
    {quick.error && <div className="mb-4"><ErrorBox error={quick.error} /></div>}
    {query.isError ? <ErrorBox error={query.error} /> : !query.data?.length ? <Empty text="ไม่มีคำขอค้างจัดของ" /> : <div className="grid gap-4 lg:grid-cols-2">{[...query.data].reverse().map((v) => <article className="panel p-5" key={v.requestId}><div className="flex justify-between gap-3"><div><p className="font-black">{v.requestId}</p><p className="text-sm text-zinc-500">{v.requestDate} · {v.itemCount ?? 0} รายการ</p></div><Badge tone="warning">{v.requestStatus}</Badge></div><p className="mt-3 text-sm">{v.note || "ไม่มีหมายเหตุ"}</p><div className="mt-4 flex gap-2"><Link className="btn-primary inline-flex items-center" href={`/inventory/requests/${v.requestId}`}>เปิดคำขอ</Link><button className="btn-secondary" disabled={quick.isPending} onClick={() => quick.mutate(v.requestId)}>จ่ายด่วนเต็มจำนวน</button></div></article>)}</div>}
  </>;
}
