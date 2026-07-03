"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErrorBox, GameButton } from "@/components/page-kit";
import { LoginField } from "@/components/login-field";
import { post } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

const schema = z.object({ username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้"), password: z.string().min(1, "กรุณากรอกรหัสผ่าน") });
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const client = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { username: "", password: "" } });
  const login = useMutation({ mutationFn: (values: Form) => post<SessionUser>("/auth/login", values), onSuccess: (user) => { client.setQueryData(["me"], user); router.replace("/dashboard"); } });

  return (
    <main className="login-page">
      <div className="login-scene">
        <Image
          src="/images/stock-market-login-scene.png"
          alt="Stock Market login"
          fill
          priority
          sizes="100vw"
          className="login-scene-image"
        />

        <form className="login-form-overlay" onSubmit={form.handleSubmit((values) => login.mutate(values))}>
          <header className="login-card__heading">
            <h1>เข้าสู่ร้านสต๊อก</h1>
            <p>ลงชื่อเข้าใช้เพื่อเริ่มจัดการสินค้า</p>
          </header>

          <LoginField
            className="login-form-field"
            label={<span className="login-field-label"><UserIcon /> ชื่อผู้ใช้</span>}
            error={form.formState.errors.username?.message}
          >
            <input id="username" autoComplete="username" placeholder="กรอกชื่อผู้ใช้" {...form.register("username")} />
          </LoginField>

          <LoginField
            className="login-form-field"
            label={<span className="login-field-label"><LockIcon /> รหัสผ่าน</span>}
            error={form.formState.errors.password?.message}
          >
            <span className="login-password-field">
              <input id="password" autoComplete="current-password" type={showPassword ? "text" : "password"} placeholder="กรอกรหัสผ่าน" {...form.register("password")} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                <EyeIcon hidden={showPassword} />
              </button>
            </span>
          </LoginField>

          {login.error && <div className="login-error-box"><ErrorBox error={login.error} /></div>}

          <GameButton type="submit" size="lg" className="login-submit" disabled={login.isPending}>
            {login.isPending ? "กำลังเข้าสู่ร้าน..." : <><span>เริ่มใช้งาน</span><span aria-hidden="true">→</span></>}
          </GameButton>
        </form>
      </div>
    </main>
  );
}

function UserIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8v3h2v5h-2v2h-2v2h5v2h2v4H3v-4h2v-2h5v-2H8v-2H6V6h2V3Zm2 3v5h4V6h-4Zm-3 11v2h10v-2H7Z"/></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2h8v2h2v6h2v12H4V10h2V4h2V2Zm0 8h8V5h-2V4h-4v1H8v5Zm-2 2v8h12v-8H6Zm5 2h2v4h-2v-4Z"/></svg>; }
function EyeIcon({ hidden }: { hidden: boolean }) { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 10h2V8h3V6h10v2h3v2h2v4h-2v2h-3v2H7v-2H4v-2H2v-4Zm4 0v4h3v2h6v-2h3v-4h-3V8H9v2H6Zm4 0h4v4h-4v-4Z"/>{hidden && <path d="m4 3 17 17-2 2L2 5z"/>}</svg>; }
