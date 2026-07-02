"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { get, post } from "@/lib/api";
import type { Role, SessionUser } from "@/lib/types";

const menus: Array<{ href: string; label: string; roles: Role[] }> = [
  { href: "/dashboard", label: "ภาพรวม", roles: ["owner", "manager", "stock", "staff"] },
  { href: "/inventory/request", label: "เลือกของ", roles: ["owner", "manager", "stock", "staff"] },
  { href: "/inventory/requests", label: "คำขอ", roles: ["owner", "manager", "stock", "staff"] },
  { href: "/inventory/stockroom", label: "ห้องคลัง", roles: ["owner", "manager", "stock"] },
  { href: "/inventory/movements", label: "เคลื่อนไหว", roles: ["owner", "manager", "stock"] },
  { href: "/inventory/count", label: "นับสต๊อก", roles: ["owner", "manager", "stock"] },
  { href: "/inventory/balances", label: "ยอดคงเหลือ", roles: ["owner", "manager", "stock"] },
  { href: "/settings/items", label: "ไอเทม", roles: ["owner", "manager"] },
  { href: "/settings/store-items", label: "ไอเทมสาขา", roles: ["owner", "manager"] },
  { href: "/settings/locations", label: "ตำแหน่ง", roles: ["owner", "manager"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname(); const router = useRouter(); const client = useQueryClient();
  const user = useQuery({ queryKey: ["me"], queryFn: () => get<SessionUser>("/auth/me"), retry: false });
  const logout = useMutation({ mutationFn: () => post("/auth/logout"), onSuccess: () => { client.clear(); router.replace("/login"); } });
  if (user.isLoading) return <FullState text="กำลังเปิดร้าน..." />;
  if (user.isError || !user.data) { router.replace("/login"); return <FullState text="กำลังกลับไปหน้าเข้าสู่ระบบ..." />; }
  const visible = menus.filter((menu) => menu.roles.includes(user.data.role));
  return <div className="min-h-screen bg-zinc-50 text-zinc-950 lg:grid lg:grid-cols-[240px_1fr]">
    <aside className="hidden border-r border-black bg-black text-white lg:flex lg:min-h-screen lg:flex-col lg:p-5"><Link href="/dashboard" className="mb-8 text-xl font-black">STOCKROOM<span className="text-red-500">.</span></Link><nav className="space-y-1">{visible.map((m) => <Nav key={m.href} {...m} active={path.startsWith(m.href)} />)}</nav></aside>
    <div className="min-w-0 pb-20 lg:pb-0"><header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-black bg-white px-4 sm:px-6"><div><p className="font-black">{user.data.displayName || user.data.username}</p><p className="text-xs text-zinc-500">{user.data.branchName} · {user.data.role}</p></div><button className="btn-secondary" onClick={() => logout.mutate()} disabled={logout.isPending}>ออกจากระบบ</button></header><main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main></div>
    <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-black bg-white lg:hidden">{visible.map((m) => <Link key={m.href} href={m.href} className={`min-w-24 flex-1 px-2 py-3 text-center text-xs font-bold ${path.startsWith(m.href) ? "bg-black text-white" : ""}`}>{m.label}</Link>)}</nav>
  </div>;
}
function Nav({ href, label, active }: { href: string; label: string; active: boolean }) { return <Link href={href} className={`block px-3 py-3 text-sm font-bold ${active ? "bg-white text-black" : "text-zinc-300 hover:bg-zinc-900"}`}>{label}</Link>; }
export function FullState({ text }: { text: string }) { return <main className="grid min-h-screen place-items-center bg-zinc-50"><p className="border border-black bg-white px-6 py-4 font-bold shadow-[5px_5px_0_#ef4444]">{text}</p></main>; }
