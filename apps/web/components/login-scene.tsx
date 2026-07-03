"use client";

import type { ReactNode } from "react";

type LoginSceneProps = {
  art: ReactNode;
  card: ReactNode;
};

export function LoginScene({ art, card }: LoginSceneProps) {
  return (
    <main className="login-scene">
      <div className="login-layout">
        <section className="storefront-panel" aria-hidden="true">{art}</section>
        <section className="login-panel">{card}</section>
      </div>
    </main>
  );
}
