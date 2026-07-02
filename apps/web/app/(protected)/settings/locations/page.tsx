"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { get, patch, post } from "@/lib/api";
import type { Location } from "@/lib/types";
import { Empty, ErrorBox, PageHeader } from "@/components/page-kit";

const schema = z.object({ locationName: z.string().min(1), locationType: z.enum(["WAREHOUSE", "FRIDGE", "KITCHEN", "COUNTER", "STORAGE"]), isActive: z.boolean() }); type Form = z.infer<typeof schema>;
export default function LocationsPage() {
  const client = useQueryClient(); const query = useQuery({ queryKey: ["locations"], queryFn: () => get<Location[]>("/locations") }); const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { locationName: "", locationType: "WAREHOUSE", isActive: true } });
  const save = useMutation({ mutationFn: (v: Form & { locationId?: string }) => v.locationId ? patch(`/locations/${v.locationId}`, v) : post("/locations", v), onSuccess: () => { client.invalidateQueries({ queryKey: ["locations"] }); form.reset({ locationName: "", locationType: "WAREHOUSE", isActive: true }); } });
  return <><PageHeader eyebrow="Store setup" title="ตำแหน่งจัดเก็บ" description="สร้างคลัง ตู้เย็น ครัว เคาน์เตอร์ และพื้นที่เก็บของของสาขา" /><div className="grid gap-6 lg:grid-cols-[360px_1fr]"><form className="panel h-fit p-5" onSubmit={form.handleSubmit((v) => save.mutate(v))}><h2 className="mb-4 text-xl font-black">เพิ่มตำแหน่ง</h2><input className="field mb-3" placeholder="ชื่อตำแหน่ง" {...form.register("locationName")} /><select className="field mb-3" {...form.register("locationType")}>{["WAREHOUSE", "FRIDGE", "KITCHEN", "COUNTER", "STORAGE"].map((v) => <option key={v}>{v}</option>)}</select><label className="mb-4 flex gap-2 text-sm"><input type="checkbox" {...form.register("isActive")} /> เปิดใช้งาน</label>{save.error && <ErrorBox error={save.error} />}<button className="btn-primary w-full" disabled={save.isPending}>บันทึก</button></form><section>{query.isError ? <ErrorBox error={query.error} /> : !query.data?.length ? <Empty text="ยังไม่มีตำแหน่ง" /> : <div className="grid gap-3 sm:grid-cols-2">{query.data.map((v) => <article className="border border-black bg-white p-4" key={v.locationId}><div className="flex justify-between"><div><p className="font-black">{v.locationName}</p><p className="text-sm text-zinc-500">{v.locationType}</p></div><label className="text-xs font-bold"><input type="checkbox" checked={v.isActive} onChange={() => save.mutate({ locationId: v.locationId, locationName: v.locationName, locationType: v.locationType as Form["locationType"], isActive: !v.isActive })} /> {v.isActive ? "ON" : "OFF"}</label></div></article>)}</div>}</section></div></>;
}
