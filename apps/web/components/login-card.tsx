"use client";

import Image from "next/image";
import type { ReactNode } from "react";

type LoginCardProps = {
  children: ReactNode;
};

export function LoginCard({ children }: LoginCardProps) {
  return (
    <div className="login-frame">
      <Image
        src="/images/stock-market-login-frame.png"
        alt=""
        fill
        priority
        sizes="(max-width: 900px) 100vw, 40vw"
        className="login-frame-image"
      />
      {children}
    </div>
  );
}
