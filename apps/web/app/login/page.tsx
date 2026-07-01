"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function getApiErrorMessage(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const message = (value as Record<string, unknown>).message;

  return typeof message === "string" ? message : null;
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setErrorMessage("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const responseBody: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(responseBody) ?? "ไม่สามารถเข้าสู่ระบบได้",
        );
      }

      router.replace("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#f7f7f8] px-4 py-8 text-black sm:px-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60 [background-image:linear-gradient(#d9d9dc_1px,transparent_1px),linear-gradient(90deg,#d9d9dc_1px,transparent_1px)] [background-size:32px_32px]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-2 bg-[#e4002b]"
      />

      <section className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-md items-center">
        <div className="w-full border border-black bg-white shadow-[8px_8px_0_0_#000000]">
          <header className="flex items-stretch border-b border-black">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-[#e4002b] text-2xl font-black tracking-[-0.08em] text-white sm:h-24 sm:w-24 sm:text-3xl">
              RM
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center px-5 py-4 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e4002b]">
                Restaurant ERP
              </p>
              <p className="mt-1 text-sm text-zinc-600">ระบบจัดการร้านอาหาร</p>
            </div>
          </header>

          <div className="p-6 sm:p-8">
            <div className="mb-7">
              <p className="mb-2 text-xs font-bold tabular-nums text-zinc-500">
                01 / LOGIN
              </p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                เข้าสู่ระบบ
              </h1>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  className="mb-2 block text-sm font-bold"
                  htmlFor="username"
                >
                  ชื่อผู้ใช้
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={isLoading}
                  className="h-14 w-full rounded-none border border-black bg-white px-4 text-base outline-none transition-shadow placeholder:text-zinc-400 focus:shadow-[4px_4px_0_0_#e4002b] disabled:cursor-not-allowed disabled:bg-zinc-100"
                  placeholder="กรอกชื่อผู้ใช้"
                />
              </div>

              <div>
                <label
                  className="mb-2 block text-sm font-bold"
                  htmlFor="password"
                >
                  รหัสผ่าน
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isLoading}
                  className="h-14 w-full rounded-none border border-black bg-white px-4 text-base outline-none transition-shadow placeholder:text-zinc-400 focus:shadow-[4px_4px_0_0_#e4002b] disabled:cursor-not-allowed disabled:bg-zinc-100"
                  placeholder="กรอกรหัสผ่าน"
                />
              </div>

              {errorMessage ? (
                <div
                  className="border-l-4 border-[#e4002b] bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                  role="alert"
                  aria-live="polite"
                >
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
                className="flex h-14 w-full items-center justify-center bg-black px-5 text-base font-bold text-white transition-colors hover:bg-[#e4002b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4002b] disabled:cursor-not-allowed disabled:bg-zinc-500"
              >
                {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
