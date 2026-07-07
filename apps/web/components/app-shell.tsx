"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { get, post } from "@/lib/api";
import type { Role, SessionUser } from "@/lib/types";

const menus: Array<{ href: string; label: string; icon: MarketIconName; roles: Role[] }> = [
  { href: "/dashboard", label: "ภาพรวม", icon: "home", roles: ["owner", "manager", "stock", "staff"] },
  { href: "/inventory/request", label: "เลือกของ", icon: "basket", roles: ["owner", "manager", "stock", "staff"] },
  { href: "/inventory/requests", label: "คำขอ", icon: "receipt", roles: ["owner", "manager", "stock", "staff"] },
  { href: "/inventory/stockroom", label: "ห้องคลัง", icon: "store", roles: ["owner", "manager", "stock"] },
  { href: "/inventory/movements", label: "เคลื่อนไหว", icon: "arrows", roles: ["owner", "manager", "stock"] },
  { href: "/inventory/count", label: "บันทึกนับ", icon: "clipboard", roles: ["owner", "manager", "stock"] },
  { href: "/inventory/balances", label: "ยอดคงเหลือ", icon: "chart", roles: ["owner", "manager", "stock"] },
  { href: "/settings/items", label: "สินค้ากลาง", icon: "box", roles: ["owner", "manager"] },
  { href: "/settings/store-items", label: "สินค้าสาขา", icon: "layers", roles: ["owner", "manager"] },
  { href: "/settings/locations", label: "ตำแหน่ง", icon: "pin", roles: ["owner", "manager"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname(); const router = useRouter(); const client = useQueryClient();
  const user = useQuery({ queryKey: ["me"], queryFn: () => get<SessionUser>("/auth/me"), retry: false });
  const logout = useMutation({ mutationFn: () => post("/auth/logout"), onSuccess: () => { client.clear(); router.replace("/login"); } });
  useEffect(() => {
    if (!user.isLoading && (user.isError || !user.data)) router.replace("/login");
  }, [router, user.data, user.isError, user.isLoading]);
  if (user.isLoading) return <FullState text="กำลังเปิดร้าน..." />;
  if (user.isError || !user.data) return <FullState text="กำลังกลับไปหน้าเข้าสู่ระบบ..." />;
  const visible = menus.filter((menu) => menu.roles.includes(user.data.role));
  return <div className="app-market min-h-screen text-[#3d281b] lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
    <aside className="market-sidebar hidden text-[#fff0ce] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
      <Link href="/dashboard" className="market-brand block px-3 pb-2 pt-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#f3c269]">
        <ShopFacade />
      </Link>
      <nav className="mt-1 space-y-1 px-3">{visible.map((m) => <Nav key={m.href} {...m} active={isMenuActive(path, m.href)} />)}</nav>
      <div className="mt-auto border-t-2 border-[#2f1a0e] bg-[#3e2313] px-4 py-3 shadow-[inset_0_2px_0_#654126]">
        <div className="flex items-center gap-3"><PixelAvatar className="h-9 w-9" /><div><p className="text-sm font-black text-[#fff0ce]">LV.25</p><div className="mt-1 h-2 w-24 border border-[#25140b] bg-[#25140b]"><span className="block h-full w-3/5 bg-[#e3a62f]" /></div></div></div>
      </div>
    </aside>
    <div className="market-main-frame min-w-0 pb-20 lg:pb-0">
      <header className="market-profile sticky top-0 z-30 flex h-[70px] items-center justify-between border-b-2 border-[#9d6a3b] bg-[#fff0ce]/95 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3"><PixelAvatar className="h-11 w-11 shrink-0" /><span className="grid h-7 min-w-9 place-items-center border-2 border-[#71331f] bg-[#b85d2e] px-1 font-mono text-[11px] font-black text-white shadow-[2px_2px_0_#71331f]" aria-hidden="true">P1</span><div className="min-w-0"><p className="truncate text-[15px] font-black leading-tight text-[#3d281b]">{user.data.displayName || user.data.username}</p><p className="mt-0.5 truncate text-[11px] font-bold text-[#765039]">{user.data.branchName} · {user.data.role}</p></div></div>
        <button className="market-logout" onClick={() => logout.mutate()} disabled={logout.isPending}><span aria-hidden="true">⇥</span> ออกจากระบบ</button>
      </header>
      <main className="market-workspace mx-auto w-full max-w-[1600px] px-6 pb-8 pt-5">{children}</main>
    </div>
    <nav className="market-mobile-nav fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-[#d6bd97] bg-[#fffaf0]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">{visible.map((m) => <Link key={m.href} href={m.href} className={`flex min-w-[84px] flex-1 flex-col items-center gap-1 px-2 py-2 text-center focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#a75d32] ${isMenuActive(path, m.href) ? "bg-[#ead5b5] text-[#754728]" : "text-[#796553]"}`}><MarketIcon name={m.icon} /><span className="market-mobile-nav__label">{m.label}</span></Link>)}</nav>
  </div>;
}
function Nav({ href, label, icon, active }: { href: string; label: string; icon: MarketIconName; active: boolean }) { return <Link href={href} className={`market-nav flex min-h-[45px] items-center gap-3 border px-3 py-2 transition-[transform,background-color,color] duration-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#f1c27a] ${active ? "border-[#d5ae73] bg-[#fff0ce] text-[#71331f] shadow-[3px_3px_0_#2d190e]" : "border-transparent text-[#fff0ce] hover:translate-x-0.5 hover:bg-[#5b361f] hover:text-white"}`}><span className={`grid h-7 w-7 place-items-center ${active ? "text-[#b24e25]" : "text-[#f2bd50]"}`}><MarketIcon name={icon} /></span><span>{label}</span>{active && <span className="ml-auto text-[#d5a12d]" aria-hidden="true">★</span>}</Link>; }
function isMenuActive(path: string, href: string) { return path === href || path.startsWith(`${href}/`); }
export function FullState({ text }: { text: string }) { return <main className="request-market grid min-h-screen place-items-center"><p className="rounded-2xl border border-[#d5b996] bg-[#fffaf0] px-6 py-4 font-black text-[#463428] shadow-[0_8px_26px_rgba(87,57,35,.12)]"><span className="mr-2 font-mono text-xs text-[#9b5d38]">LOADING</span>{text}</p></main>; }

type MarketIconName = "home" | "basket" | "receipt" | "store" | "arrows" | "clipboard" | "chart" | "box" | "layers" | "pin";

function ShopFacade() {
  return <div className="market-facade" aria-label="Restaurant Inventory Stock Market">
    <div className="market-signboard border-[3px] border-[#25140b] bg-[#72421f] px-2 py-2 text-center shadow-[inset_0_0_0_3px_#aa7137,4px_4px_0_#25140b]">
      <span className="block font-mono text-[8px] font-black tracking-[.12em] text-[#fff0ce]">RESTAURANT INVENTORY</span>
      <strong className="market-logo-word mt-1 block text-[29px] font-black leading-[.86] text-white">STOCK</strong>
      <strong className="market-logo-word block text-[29px] font-black leading-none text-[#f3bf36]">MARKET</strong>
    </div>
    <svg viewBox="0 0 220 82" className="mt-1 block h-[82px] w-full [image-rendering:pixelated]" shapeRendering="crispEdges" aria-hidden="true">
      <path fill="#25140b" d="M8 22h204v8h6v48H2V30h6z"/><path fill="#71401f" d="M8 29h204v43H8z"/>
      <path fill="#fff0ce" d="M12 16h24v18H12zm48 0h24v18H60zm48 0h24v18h-24zm48 0h24v18h-24zm48 0h12v18h-12z"/>
      <path fill="#c93d26" d="M0 16h24v18H0zm48 0h24v18H48zm48 0h24v18H96zm48 0h24v18h-24zm48 0h24v18h-24z"/>
      <path fill="#3b2111" d="M82 34h56v44H82z"/><path fill="#92552a" d="M88 38h44v40H88z"/><path fill="#4b2a15" d="M105 38h6v40h-6z"/><path fill="#e0a038" d="M116 56h5v5h-5z"/>
      <path fill="#315f56" d="M16 40h54v28H16zm134 0h54v28h-54z"/><path fill="#74a59b" d="M22 44h42v18H22zm134 0h42v18h-42z"/>
      <path fill="#3e6b24" d="M10 60h14v-10h8v22H10zm178 1h10V49h8v23h-18z"/><path fill="#d78928" d="M7 68h28v10H7zm178 0h28v10h-28z"/>
      <path fill="#f0bd39" d="M35 57h7v7h-7zm9-5h7v12h-7zm9 4h7v8h-7zm105 0h8v8h-8zm10-6h8v14h-8zm10 7h7v7h-7z"/>
    </svg>
  </div>;
}

function PixelAvatar({ className }: { className: string }) {
  return <span className={`block overflow-hidden border-2 border-[#4a2a16] bg-[#f5c66d] shadow-[2px_2px_0_#70421f] ${className}`} aria-hidden="true"><svg viewBox="0 0 40 40" className="h-full w-full [image-rendering:pixelated]" shapeRendering="crispEdges"><path fill="#d78a2d" d="M8 4h24v4h5v8H3V8h5z"/><path fill="#f2c24f" d="M12 1h16v4H12z"/><path fill="#57311d" d="M8 14h24v17H8z"/><path fill="#f1ad70" d="M12 15h16v13H12z"/><path fill="#3d2418" d="M13 18h4v4h-4zm10 0h4v4h-4z"/><path fill="#fff3d5" d="M15 24h10v3H15z"/><path fill="#2f6e74" d="M8 29h24v11H8z"/><path fill="#f1ad70" d="M4 30h5v8H4zm27 0h5v8h-5z"/></svg></span>;
}
function MarketIcon({ name }: { name: MarketIconName }) {
  const paths: Record<MarketIconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></>,
    basket: <><path d="m5 9 3-5m11 5-3-5M3 9h18l-2 11H5L3 9Z"/><path d="M8 13v3m4-3v3m4-3v3"/></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6m-6 4h6"/></>,
    store: <><path d="M4 10v10h16V10M3 10l2-6h14l2 6"/><path d="M8 20v-6h8v6M3 10c1 2 3 2 4 0 1 2 3 2 5 0 1 2 3 2 5 0 1 2 3 2 4 0"/></>,
    arrows: <><path d="M4 7h14m-4-4 4 4-4 4M20 17H6m4 4-4-4 4-4"/></>,
    clipboard: <><path d="M8 5H5v16h14V5h-3M9 3h6v4H9V3Z"/><path d="m8 13 2 2 5-5m-7 9h7"/></>,
    chart: <><path d="M4 20V10h4v10m4 0V4h4v16m4 0V7"/><path d="M2 20h20"/></>,
    box: <><path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"/><path d="m4 7 8 4 8-4m-8 4v10"/></>,
    layers: <><path d="m3 8 9-5 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><path d="M9 10h6m-3-3v6"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">{paths[name]}</svg>;
}
