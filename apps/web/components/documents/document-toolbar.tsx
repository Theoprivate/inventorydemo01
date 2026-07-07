"use client";

import Link from "next/link";

export function DocumentToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="document-toolbar mx-auto mb-4 flex w-full max-w-[210mm] items-center justify-between gap-3">
      <Link className="document-toolbar__button" href={backHref}>กลับ</Link>
      <button className="document-toolbar__button document-toolbar__button--primary" type="button" onClick={() => window.print()}>
        พิมพ์เอกสาร
      </button>
    </div>
  );
}
