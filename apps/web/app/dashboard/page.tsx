"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface SessionUser {
  userId: string;
  username: string;
  displayName: string;
  role: string;
}

interface AuthMeResponse {
  ok: true;
  user: SessionUser;
}

function isAuthMeResponse(value: unknown): value is AuthMeResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;

  if (response.ok !== true || typeof response.user !== "object" || !response.user) {
    return false;
  }

  const user = response.user as Record<string, unknown>;

  return (
    typeof user.userId === "string" &&
    typeof user.username === "string" &&
    typeof user.displayName === "string" &&
    typeof user.role === "string"
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function checkSession() {
      setIsCheckingSession(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const responseBody: unknown = await response.json().catch(() => null);

        if (!response.ok || !isAuthMeResponse(responseBody)) {
          throw new Error("ไม่สามารถตรวจสอบการเข้าสู่ระบบได้");
        }

        setUser(responseBody.user);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingSession(false);
        }
      }
    }

    void checkSession();

    return () => controller.abort();
  }, [retryCount, router]);

  async function handleLogout() {
    setIsLoggingOut(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("ไม่สามารถออกจากระบบได้");
      }

      router.replace("/login");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      );
      setIsLoggingOut(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[#f7f7f8] px-4 text-black">
        <div className="border border-black bg-white px-6 py-5 shadow-[6px_6px_0_0_#e4002b]">
          <p className="text-sm font-bold" role="status">
            กำลังตรวจสอบการเข้าสู่ระบบ...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[#f7f7f8] px-4 text-black">
        <section className="w-full max-w-sm border border-black bg-white p-6 shadow-[8px_8px_0_0_#000000]">
          <div className="mb-5 h-2 w-16 bg-[#e4002b]" aria-hidden="true" />
          <h1 className="text-2xl font-black">เชื่อมต่อไม่สำเร็จ</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600" role="alert">
            {errorMessage ?? "ไม่สามารถตรวจสอบการเข้าสู่ระบบได้"}
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-6 h-14 w-full bg-black px-5 font-bold text-white transition-colors hover:bg-[#e4002b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4002b]"
          >
            ลองใหม่
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] bg-[#f7f7f8] text-black">
      <div className="h-2 bg-[#e4002b]" aria-hidden="true" />

      <header className="border-b border-black bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#e4002b] text-lg font-black tracking-[-0.08em] text-white">
              RM
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase tracking-[0.12em]">
                Restaurant ERP
              </p>
              <p className="text-xs text-zinc-500">ระบบจัดการร้านอาหาร</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="h-12 shrink-0 border border-black bg-white px-4 text-sm font-bold transition-colors hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4002b] disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {isLoggingOut ? "กำลังออก..." : "ออกจากระบบ"}
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="border border-black bg-white shadow-[8px_8px_0_0_#000000]">
          <div className="grid border-b border-black sm:grid-cols-[1fr_auto]">
            <div className="p-6 sm:p-8">
              <p className="mb-3 text-xs font-bold tabular-nums text-[#e4002b]">
                01 / DASHBOARD
              </p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                เข้าสู่ระบบสำเร็จ
              </h1>
              <p className="mt-3 text-zinc-600">
                ยินดีต้อนรับ {user.displayName || user.username}
              </p>
            </div>
            <div
              aria-hidden="true"
              className="hidden min-w-32 items-center justify-center border-l border-black bg-[#e4002b] text-6xl font-black text-white sm:flex"
            >
              01
            </div>
          </div>

          <dl className="grid sm:grid-cols-3">
            <div className="border-b border-black p-5 sm:border-b-0 sm:border-r">
              <dt className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                ชื่อที่แสดง
              </dt>
              <dd className="mt-2 break-words text-lg font-bold">
                {user.displayName || "-"}
              </dd>
            </div>
            <div className="border-b border-black p-5 sm:border-b-0 sm:border-r">
              <dt className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                ชื่อผู้ใช้
              </dt>
              <dd className="mt-2 break-words text-lg font-bold">
                {user.username}
              </dd>
            </div>
            <div className="p-5">
              <dt className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                บทบาท
              </dt>
              <dd className="mt-2 break-words text-lg font-bold">{user.role}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-8 border border-dashed border-zinc-400 bg-white p-6 sm:p-8">
          <p className="mb-3 text-xs font-bold tabular-nums text-zinc-500">
            02 / NEXT PHASE
          </p>
          <h2 className="text-2xl font-black">นับสต๊อก - เฟสถัดไป</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            ส่วนนี้จะเปิดใช้งานในเฟสถัดไป
          </p>
        </section>

        {errorMessage ? (
          <p
            className="mt-6 border-l-4 border-[#e4002b] bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
