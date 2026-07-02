"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErrorBox } from "@/components/page-kit";
import { post } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

const schema = z.object({ username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้"), password: z.string().min(1, "กรุณากรอกรหัสผ่าน") }); type Form = z.infer<typeof schema>;
export default function LoginPage() {
  const router = useRouter(); const client = useQueryClient(); const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { username: "", password: "" } });
  const login = useMutation({ mutationFn: (values: Form) => post<SessionUser>("/auth/login", values), onSuccess: (user) => { client.setQueryData(["me"], user); router.replace("/dashboard"); } });
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-zinc-100 p-4 text-black"><div aria-hidden className="absolute inset-0 opacity-50 [background-image:linear-gradient(#d4d4d8_1px,transparent_1px),linear-gradient(90deg,#d4d4d8_1px,transparent_1px)] [background-size:32px_32px]" /><section className="relative w-full max-w-md border border-black bg-white shadow-[9px_9px_0_#18181b]"><header className="flex border-b border-black"><div className="grid h-24 w-24 place-items-center bg-red-600 text-2xl font-black text-white">RM</div><div className="flex flex-col justify-center px-5"><p className="text-xs font-black uppercase tracking-[.2em] text-red-600">Restaurant Inventory</p><p className="mt-1 text-sm text-zinc-500">ระบบคลังและเบิกสินค้าร้านอาหาร</p></div></header><form className="p-6 sm:p-8" onSubmit={form.handleSubmit((v) => login.mutate(v))}><p className="text-xs font-black text-zinc-400">01 / LOGIN</p><h1 className="mb-6 mt-1 text-4xl font-black">เข้าสู่ระบบ</h1><label className="block text-sm font-bold">ชื่อผู้ใช้<input autoComplete="username" className="field mt-2" {...form.register("username")} /></label><label className="mt-4 block text-sm font-bold">รหัสผ่าน<input autoComplete="current-password" type="password" className="field mt-2" {...form.register("password")} /></label>{(form.formState.errors.username || form.formState.errors.password) && <p className="mt-3 text-sm text-red-700">{form.formState.errors.username?.message || form.formState.errors.password?.message}</p>}{login.error && <div className="mt-4"><ErrorBox error={login.error} /></div>}<button className="btn-primary mt-6 w-full" disabled={login.isPending}>{login.isPending ? "กำลังเข้าสู่ร้าน..." : "เข้าสู่ระบบ"}</button></form></section></main>;
}
