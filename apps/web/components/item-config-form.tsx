"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ItemImage } from "@/components/item-image";
import { ActionBar, EmptyState, ErrorBox, FormField, GameButton, GameButtonLink, GamePanel, PageHeader } from "@/components/page-kit";
import { get, patch, post } from "@/lib/api";
import { isValidItemImageInput } from "@/lib/image-url";
import type { Category, Item, SessionUser } from "@/lib/types";

const itemFormSchema = z.object({
  itemName: z.string().trim().min(1, "กรุณากรอกชื่อสินค้า"),
  categoryId: z.string().trim().min(1, "กรุณาเลือกหมวดหมู่"),
  unit: z.string().trim().min(1, "กรุณากรอกหน่วย"),
  imageUrl: z.string().refine(isValidItemImageInput, "ใช้ path ที่ขึ้นต้นด้วย / หรือ HTTPS URL ของไฟล์ webp, png, jpg, jpeg"),
  description: z.string(),
  isActive: z.boolean(),
});
type ItemForm = z.infer<typeof itemFormSchema>;

export function ItemConfigForm({ item }: { item?: Item }) {
  const router = useRouter();
  const client = useQueryClient();
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => get<Category[]>("/categories") });
  const me = useQuery({ queryKey: ["me"], queryFn: () => get<SessionUser>("/auth/me"), retry: false });
  const form = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: item ? { itemName: item.itemName, categoryId: item.categoryId, unit: item.unit, imageUrl: item.imageUrl, description: item.description, isActive: item.isActive } : { itemName: "", categoryId: "", unit: "", imageUrl: "", description: "", isActive: true },
  });
  const save = useMutation({
    mutationFn: (value: ItemForm) => item ? patch<Item>(`/items/${item.itemId}`, value) : post<Item>("/items", value),
    onSuccess: async (savedItem) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["items"] }),
        client.invalidateQueries({ queryKey: ["requestable-items"] }),
      ]);
      sessionStorage.setItem("item-config-success", `${item ? "บันทึกการแก้ไข" : "เพิ่ม"} ${savedItem.itemName} เรียบร้อยแล้ว`);
      router.replace("/settings/items");
    },
  });
  const submit = (value: ItemForm) => {
    if (save.isPending) return;
    save.mutate({
      ...value,
      itemName: value.itemName.trim(),
      categoryId: value.categoryId.trim(),
      unit: value.unit.trim(),
      imageUrl: value.imageUrl.trim(),
      description: value.description.trim(),
    });
  };
  const previewUrl = form.watch("imageUrl");
  const previewName = form.watch("itemName") || item?.itemName || "สินค้า";

  if (me.isLoading) return <GamePanel className="animate-pulse p-8"><div className="h-6 w-40 bg-[var(--color-game-border)]"/><div className="mt-4 h-40 bg-[var(--color-game-cream-active)]"/></GamePanel>;
  if (me.data && me.data.role !== "owner" && me.data.role !== "manager") return <EmptyState title="บัญชีนี้ไม่มีสิทธิ์แก้ไขข้อมูลไอเทม" action={<GameButtonLink href="/settings/items" variant="secondary">กลับรายการไอเทม</GameButtonLink>} />;

  return <>
    <PageHeader eyebrow={item ? "Edit Item · Master Data" : "New Item · Master Data"} title={item ? "แก้ไขไอเทม" : "เพิ่มไอเทม"} description={item ? "แก้ข้อมูลกลางและรูปสินค้า แล้วบันทึกกลับไปยัง Items" : "สร้างข้อมูลกลางของสินค้าใหม่ใน Items"} actions={<GameButtonLink href="/settings/items" variant="secondary">← กลับรายการไอเทม</GameButtonLink>} />
    <form onSubmit={form.handleSubmit(submit)} className="grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="h-fit">
        <p className="page-market-header__eyebrow">IMAGE PREVIEW</p>
        <GamePanel className="p-4"><ItemImage src={previewUrl} itemName={previewName} className="w-full" /></GamePanel>
        <GamePanel className="mt-5 bg-[var(--color-game-cream-active)] p-4 text-xs leading-relaxed">
          <p className="font-black">วางไฟล์ไว้ใน:</p><code className="mt-1 block break-all">apps/web/public/images/items/</code>
          <p className="mt-3 font-black">แล้วกรอก:</p><code className="mt-1 block break-all">/images/items/red-pork.webp</code>
        </GamePanel>
      </aside>
      <GamePanel className="p-5 sm:p-6">
        {item && <FormField label="Item ID"><input className="font-mono" value={item.itemId} readOnly aria-readonly="true" /></FormField>}
        <div className={item ? "mt-5" : ""}><FormField label="ชื่อสินค้า" error={form.formState.errors.itemName?.message}><input autoFocus {...form.register("itemName")} /></FormField></div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <FormField label="หมวดหมู่" error={form.formState.errors.categoryId?.message}><select {...form.register("categoryId")}><option value="">เลือกหมวดหมู่</option>{categories.data?.filter((value) => value.categoryId && value.categoryName).map((value, index) => <option key={`category-${value.categoryId}-${index}`} value={value.categoryId}>{value.categoryName}</option>)}</select></FormField>
          <FormField label="หน่วย" error={form.formState.errors.unit?.message}><input placeholder="เช่น กก., ชิ้น, ขวด" {...form.register("unit")} /></FormField>
        </div>
        <div className="mt-5"><FormField label="Image URL" error={form.formState.errors.imageUrl?.message} hint="รองรับ local path ที่ขึ้นต้นด้วย / และ full HTTPS URL">
          <div className="flex flex-col gap-2 sm:flex-row"><input className="field min-w-0 flex-1" placeholder="/images/items/red-pork.webp" {...form.register("imageUrl")} /><GameButton type="button" variant="secondary" className="shrink-0" onClick={() => form.setValue("imageUrl", "", { shouldDirty: true, shouldValidate: true })}>ล้างรูป</GameButton></div>
        </FormField></div>
        <div className="mt-5"><FormField label="คำอธิบาย"><textarea className="min-h-28 resize-y" {...form.register("description")} /></FormField></div>
        <label className="mt-5 flex min-h-12 items-center gap-3 rounded-[5px] border border-[var(--color-game-border)] bg-[var(--color-game-cream-active)] px-4 text-sm font-black"><input type="checkbox" {...form.register("isActive")} /> เปิดใช้งาน</label>
        {save.error && <div className="mt-5"><ErrorBox error={save.error} /></div>}
        <ActionBar className="mt-6"><GameButtonLink href="/settings/items" variant="secondary">ยกเลิก</GameButtonLink><GameButton type="submit" disabled={save.isPending}>{save.isPending ? "กำลังบันทึก..." : item ? "บันทึกการแก้ไข" : "เพิ่มไอเทม"}</GameButton></ActionBar>
      </GamePanel>
    </form>
  </>;
}
