"use client";
import { useState } from "react";
import { normalizeImageUrl } from "@/lib/image-url";

export function ProductImage({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = normalizeImageUrl(src);
  if (!imageUrl || failed) return <div className="grid aspect-square place-items-center bg-zinc-100 text-4xl font-black text-zinc-400" aria-label={`ไม่มีรูป ${name}`}>{name.trim().charAt(0) || "?"}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imageUrl} alt={name} onError={() => setFailed(true)} className="aspect-square h-full w-full object-cover" />;
}
