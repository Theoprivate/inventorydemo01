"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ErrorBox, GameCard, GamePanel, PageHeader, StatusBadge } from "@/components/page-kit";
import { get } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

export default function DashboardPage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => get<DashboardSummary>("/dashboard") });
  return <AppShell><PageHeader eyebrow="Market Control · Today" title="ภาพรวมตลาดวันนี้" description="ดูคิวงาน สินค้าใกล้หมด และเริ่มงานหลักจากจุดเดียว" />
    {query.isError ? <ErrorBox error={query.error} retry={() => query.refetch()} /> : <section aria-label="สถานะวันนี้" className="grid gap-4 sm:grid-cols-3">{[["QUEUE 01", "คำขอรอดำเนินการ", query.data?.pendingRequests], ["ALERT 02", "ไอเทมต่ำกว่าขั้นต่ำ", query.data?.lowStockItems], ["TASK 03", "รายการที่ต้องนับ", query.data?.dailyCountItems]].map(([code, label, value], index) => <GamePanel key={String(label)} className="p-5"><StatusBadge tone={index === 1 ? "danger" : "neutral"}>{code}</StatusBadge><p className="mt-3 text-sm font-black text-[var(--color-game-muted)]">{label}</p><p className="mt-3 text-5xl font-black leading-none text-[var(--color-game-brown)]">{query.isLoading ? "–" : value}</p></GamePanel>)}</section>}
    <section className="mt-9"><div className="mb-4"><p className="page-market-header__eyebrow">QUICK TRAVEL</p><h2 className="text-xl font-black text-[var(--color-game-brown)]">ไปยังโซนงาน</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["STALL 01", "เลือกของ", "/inventory/request"], ["DOCK 02", "รับของเข้า", "/inventory/movements"], ["CHECK 03", "นับสต๊อก", "/inventory/count"], ["QUEUE 04", "ดูคำขอ", "/inventory/stockroom"]].map(([code, label, href]) => <GameCard interactive key={href}><Link className="group block p-5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[var(--color-game-caramel)]" href={href}><StatusBadge>{code}</StatusBadge><span className="mt-4 flex items-center justify-between font-black text-[var(--color-game-brown)]"><span>{label}</span><span aria-hidden="true">→</span></span></Link></GameCard>)}</div></section>
  </AppShell>;
}
