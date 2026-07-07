"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ItemImage } from "@/components/item-image";
import { ActionBar, EmptyState, ErrorBox, FormField, GameButton, GameButtonLink, GamePanel, PageHeader } from "@/components/page-kit";
import { get, patch, post } from "@/lib/api";
import { applyUploadedItemImage, compressItemImage, formatImageFileSize, type CompressedItemImage } from "@/lib/item-image-upload";
import { getItemImageInputError } from "@/lib/image-url";
import { uploadFormData } from "@/lib/upload-form-data";
import type { Category, Item, SessionUser } from "@/lib/types";

const itemFormSchema = z.object({
  itemName: z.string().trim().min(1, "กรุณากรอกชื่อสินค้า"),
  categoryId: z.string().trim().min(1, "กรุณาเลือกหมวดหมู่"),
  unit: z.string().trim().min(1, "กรุณากรอกหน่วย"),
  imageUrl: z.string().superRefine((value, context) => {
    const message = getItemImageInputError(value);
    if (message) context.addIssue({ code: "custom", message });
  }),
  description: z.string(),
  isActive: z.boolean(),
});
export type ItemForm = z.infer<typeof itemFormSchema>;

type UploadedItemImage = { imageUrl: string };
const ACCEPTED_IMAGE_TYPES = ["image/webp", "image/png", "image/jpeg"];

export function ItemConfigForm({ item }: { item?: Item }) {
  const router = useRouter();
  const client = useQueryClient();
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => get<Category[]>("/categories") });
  const me = useQuery({ queryKey: ["me"], queryFn: () => get<SessionUser>("/auth/me"), retry: false });
  const form = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: item ? { itemName: item.itemName, categoryId: item.categoryId, unit: item.unit, imageUrl: item.imageUrl, description: item.description, isActive: item.isActive } : { itemName: "", categoryId: "", unit: "", imageUrl: "", description: "", isActive: true },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef("");
  const uploadSequence = useRef(0);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [compression, setCompression] = useState<CompressedItemImage>();
  const [uploadError, setUploadError] = useState("");

  const replaceLocalPreview = (nextUrl: string) => {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = nextUrl;
    setLocalPreviewUrl(nextUrl);
  };

  useEffect(() => () => {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
  }, []);

  const uploadImage = async (file?: File) => {
    if (!file) return;
    const sequence = ++uploadSequence.current;
    setIsProcessing(false);
    setIsUploading(false);
    setSelectedFile(file);
    setCompression(undefined);
    setUploadError("");
    replaceLocalPreview("");

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("รองรับเฉพาะไฟล์ WebP, PNG และ JPG");
      return;
    }

    setIsProcessing(true);
    let compressed: CompressedItemImage;
    try {
      compressed = await compressItemImage(file);
    } catch {
      if (sequence !== uploadSequence.current) return;
      replaceLocalPreview("");
      setUploadError("ไม่สามารถปรับขนาดรูปได้ กรุณาเลือกรูปใหม่");
      return;
    } finally {
      if (sequence === uploadSequence.current) setIsProcessing(false);
    }
    if (sequence !== uploadSequence.current) return;

    setCompression(compressed);
    replaceLocalPreview(URL.createObjectURL(compressed.file));
    setIsUploading(true);
    try {
      const data = new FormData();
      data.append("file", compressed.file);
      data.append("itemId", item?.itemId || "new-item");
      const uploaded = await uploadFormData<UploadedItemImage>("/api/uploads/items", data);
      if (sequence !== uploadSequence.current) return;
      applyUploadedItemImage(form.setValue, uploaded);
    } catch (error) {
      if (sequence !== uploadSequence.current) return;
      setUploadError(error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      if (sequence === uploadSequence.current) setIsUploading(false);
    }
  };

  const removeImage = () => {
    uploadSequence.current += 1;
    setIsProcessing(false);
    setIsUploading(false);
    setSelectedFile(undefined);
    setCompression(undefined);
    setUploadError("");
    replaceLocalPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    form.setValue("imageUrl", "", { shouldDirty: true, shouldValidate: true });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void uploadImage(event.dataTransfer.files[0]);
  };
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
    if (save.isPending || isProcessing || isUploading) return;
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
    <PageHeader eyebrow={item ? "Edit master product" : "New master product"} title={item ? "แก้ไขสินค้ากลาง" : "เพิ่มสินค้ากลาง"} description={item ? "แก้ข้อมูลที่ทุกสาขาใช้ร่วมกัน" : "สร้างสินค้ากลางก่อน แล้วค่อยเปิดใช้ในแต่ละสาขา"} actions={<GameButtonLink href="/settings/items" variant="secondary">← กลับสินค้ากลาง</GameButtonLink>} />
    <form onSubmit={form.handleSubmit(submit)} className="grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="h-fit">
        <p className="page-market-header__eyebrow">IMAGE PREVIEW</p>
        <GamePanel className="p-4"><ItemImage src={previewUrl} itemName={previewName} className="w-full" /></GamePanel>
        <GamePanel className="item-form-guidance mt-5 bg-[var(--color-game-cream-active)] p-4">
          <p className="item-form-guidance__title">คำแนะนำสำหรับรูปสินค้า</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>รูปแนะนำ 800 × 600 px</li>
            <li>สัดส่วน 4:3</li>
            <li>รองรับ WebP, PNG และ JPG</li>
            <li>ขนาดไม่เกิน 500 KB</li>
          </ul>
        </GamePanel>
      </aside>
      <GamePanel className="p-5 sm:p-6">
        {item && <FormField label="Item ID"><input value={item.itemId} readOnly aria-readonly="true" /></FormField>}
        <div className={item ? "mt-5" : ""}><FormField label="ชื่อสินค้า" error={form.formState.errors.itemName?.message}><input autoFocus {...form.register("itemName")} /></FormField></div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <FormField label="หมวดหมู่" error={form.formState.errors.categoryId?.message}><select {...form.register("categoryId")}><option value="">เลือกหมวดหมู่</option>{categories.data?.filter((value) => value.categoryId && value.categoryName).map((value, index) => <option key={`category-${value.categoryId}-${index}`} value={value.categoryId}>{value.categoryName}</option>)}</select></FormField>
          <FormField label="หน่วย" error={form.formState.errors.unit?.message}><input placeholder="เช่น กก., ชิ้น, ขวด" {...form.register("unit")} /></FormField>
        </div>
        <div className="mt-5">
          <p className="game-form-field__label">อัปโหลดรูปสินค้า</p>
          <div
            className={`mt-2 border-2 border-dashed p-4 transition-colors ${isDragging ? "border-[var(--color-game-orange)] bg-[var(--color-game-cream-active)]" : "border-[var(--color-game-border)] bg-amber-50"}`}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false); }}
            onDrop={handleDrop}
            data-testid="item-image-dropzone"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept="image/webp,image/png,image/jpeg"
              onChange={(event) => void uploadImage(event.target.files?.[0])}
              data-testid="item-image-file-input"
            />
            <div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-center">
              <div className="aspect-[4/3] overflow-hidden border border-[var(--color-game-border)] bg-white">
                {localPreviewUrl
                  ? <img src={localPreviewUrl} alt={`ตัวอย่าง ${selectedFile?.name || previewName}`} className="h-full w-full object-contain p-2" data-testid="item-image-local-preview" />
                  : <ItemImage src={previewUrl} itemName={previewName} className="h-full w-full" />}
              </div>
              <div className="min-w-0">
                <p className="item-upload__prompt">ลากรูปมาวางที่นี่ หรือเลือกไฟล์จากเครื่อง</p>
                {selectedFile && <p className="item-upload__filename mt-2 break-all" data-testid="item-image-file-meta">{selectedFile.name}</p>}
                {compression && <div className="item-upload__metadata mt-2 space-y-1" data-testid="item-image-compression-meta">
                  <p>ไฟล์เดิม: {formatImageFileSize(compression.originalSize)}</p>
                  <p>หลังบีบอัด: {formatImageFileSize(compression.compressedSize)}</p>
                  <p>ขนาดภาพ: {compression.width} × {compression.height} px</p>
                </div>}
                {isProcessing && <p className="item-upload__status mt-2 text-[var(--color-game-orange)]" role="status">กำลังปรับขนาดรูป...</p>}
                {isUploading && <p className="item-upload__status mt-2 text-[var(--color-game-orange)]" role="status">กำลังอัปโหลด...</p>}
                {uploadError && <p className="item-upload__status mt-2 text-red-700" role="alert">{uploadError}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <GameButton type="button" variant="secondary" size="sm" disabled={isProcessing || isUploading} onClick={() => fileInputRef.current?.click()}>
                    {previewUrl || localPreviewUrl ? "เปลี่ยนรูป" : "เลือกรูปจากเครื่อง"}
                  </GameButton>
                  {(previewUrl || localPreviewUrl || selectedFile) && <GameButton type="button" variant="danger" size="sm" onClick={removeImage}>ลบรูป</GameButton>}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5"><FormField label="ลิงก์รูปภาพ (ไม่บังคับ)" error={form.formState.errors.imageUrl?.message} hint="เลือกรูปจากเครื่องด้านบน หรือวาง HTTPS URL">
          <input className="field min-w-0 w-full" placeholder="/images/items/red-pork.webp หรือ https://..." {...form.register("imageUrl")} />
        </FormField></div>
        <div className="mt-5"><FormField label="คำอธิบาย"><textarea className="min-h-28 resize-y" {...form.register("description")} /></FormField></div>
        <label className="item-form-active mt-5 flex min-h-12 items-center gap-3 rounded-[5px] border border-[var(--color-game-border)] bg-[var(--color-game-cream-active)] px-4"><input type="checkbox" {...form.register("isActive")} /> เปิดใช้งาน</label>
        {save.error && <div className="mt-5"><ErrorBox error={save.error} /></div>}
        <ActionBar className="mt-6"><GameButtonLink href="/settings/items" variant="secondary">ยกเลิก</GameButtonLink><GameButton type="submit" disabled={save.isPending || isProcessing || isUploading}>{save.isPending ? "กำลังบันทึก..." : item ? "บันทึกการแก้ไข" : "เพิ่มไอเทม"}</GameButton></ActionBar>
      </GamePanel>
    </form>
  </>;
}
