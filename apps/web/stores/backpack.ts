"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface BackpackItem { itemId: string; itemName: string; unit: string; requestedQty: number; note: string }
interface BackpackState { items: BackpackItem[]; requestNote: string; add(item: Omit<BackpackItem, "requestedQty" | "note">): void; update(itemId: string, patch: Partial<Pick<BackpackItem, "requestedQty" | "note">>): void; remove(itemId: string): void; setRequestNote(note: string): void; clear(): void }
export const useBackpack = create<BackpackState>()(persist((set) => ({ items: [], requestNote: "", add: (item) => set((state) => state.items.some((v) => v.itemId === item.itemId) ? state : { items: [...state.items, { ...item, requestedQty: 1, note: "" }] }), update: (itemId, patch) => set((state) => ({ items: state.items.map((v) => v.itemId === itemId ? { ...v, ...patch } : v) })), remove: (itemId) => set((state) => ({ items: state.items.filter((v) => v.itemId !== itemId) })), setRequestNote: (requestNote) => set({ requestNote }), clear: () => set({ items: [], requestNote: "" }) }), { name: "inventory-backpack", storage: createJSONStorage(() => sessionStorage) }));
