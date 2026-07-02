import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Restaurant ERP",
  description: "ระบบจัดการร้านอาหารและสินค้าคงคลัง",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
