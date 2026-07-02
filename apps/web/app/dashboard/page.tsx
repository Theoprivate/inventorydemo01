"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ErrorBox, PageHeader } from "@/components/page-kit";
import { get } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

export default function DashboardPage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => get<DashboardSummary>("/dashboard") });
  return <AppShell><PageHeader eyebrow="Restaurant Inventory" title="ภาพรวมวันนี้" description="ดูงานค้าง สต๊อกต่ำ และเริ่มงานหลักของร้านจากจุดเดียว" />
    {query.isError ? <ErrorBox error={query.error} retry={() => query.refetch()} /> : <div className="grid gap-4 sm:grid-cols-3">{[["คำขอรอดำเนินการ", query.data?.pendingRequests], ["ไอเทมต่ำกว่าขั้นต่ำ", query.data?.lowStockItems], ["รายการที่ต้องนับ", query.data?.dailyCountItems]].map(([label, value]) => <div key={String(label)} className="panel p-5"><p className="text-sm text-zinc-500">{label}</p><p className="mt-3 text-4xl font-black">{query.isLoading ? "–" : value}</p></div>)}</div>}
    <section className="mt-8"><h2 className="mb-4 text-xl font-black">เริ่มงานด่วน</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["เลือกของ", "/inventory/request"], ["รับของเข้า", "/inventory/movements"], ["นับสต๊อก", "/inventory/count"], ["ดูคำขอ", "/inventory/stockroom"]].map(([label, href]) => <Link className="border border-black bg-white p-5 font-black transition hover:-translate-y-1 hover:bg-black hover:text-white" key={href} href={href}>{label} →</Link>)}</div></section>
  </AppShell>;
}
