import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Restaurant ERP",
  description: "ระบบจัดการร้านอาหารและสินค้าคงคลัง",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th">
      <body suppressHydrationWarning><Providers>{children}</Providers></body>
    </html>
  );
}
