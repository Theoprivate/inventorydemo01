"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ItemConfigForm } from "@/components/item-config-form";
import { EmptyState, ErrorBox, GameButtonLink, GamePanel } from "@/components/page-kit";
import { get } from "@/lib/api";
import type { Item } from "@/lib/types";

export default function EditItemPage() {
  const itemId = decodeURIComponent(String(useParams().itemId));
  const query = useQuery({ queryKey: ["items"], queryFn: () => get<Item[]>("/items") });
  if (query.isLoading) return <GamePanel className="animate-pulse p-8"><div className="h-6 w-40 bg-[var(--color-game-border)]"/><div className="mt-4 h-12 bg-[var(--color-game-cream-active)]"/><div className="mt-4 h-48 bg-[var(--color-game-cream-active)]"/></GamePanel>;
  if (query.isError) return <ErrorBox error={query.error} retry={() => query.refetch()} />;
  const item = query.data?.find((value) => value.itemId === itemId && value.itemId.trim() !== "" && value.itemName.trim() !== "");
  if (!item) return <EmptyState title={`ไม่พบไอเทมรหัส ${itemId}`} action={<GameButtonLink href="/settings/items" variant="secondary">กลับรายการไอเทม</GameButtonLink>} />;
  return <ItemConfigForm item={item} />;
}
