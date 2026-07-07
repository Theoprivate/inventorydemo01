import type { StockRequest, StockRequestItem, UserSummary } from "@/lib/types";

type NamedItem = NonNullable<StockRequestItem["item"]> & {
  displayName?: string;
  name?: string;
  productName?: string;
};

const thaiShortMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export const statusText: Record<string, string> = {
  DRAFT: "แบบร่าง",
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  PARTIAL: "จ่ายบางส่วน",
  COMPLETED: "จ่ายครบแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิกแล้ว",
};

export function formatThaiDate(value: string | undefined | null) {
  if (!value?.trim()) return "ไม่พบวันที่";
  const date = new Date(`${value.trim()}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const thaiYear = String(date.getFullYear() + 543).slice(-2);
  return `${date.getDate()} ${thaiShortMonths[date.getMonth()]} ${thaiYear}`;
}

export function displayRequestNumber(request: Pick<StockRequest, "requestDate" | "createdAt" | "requestId">) {
  const compactDate = (request.requestDate || request.createdAt || "")
    .slice(0, 10)
    .replace(/\D/g, "");
  const tail = request.requestId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  return `REQ-${compactDate || "NO-DATE"}-${tail || "NO-ID"}`;
}

export function displayUserName(user: UserSummary | undefined, emptyText: string) {
  const name = user?.displayName?.trim() || user?.username?.trim();
  return name || emptyText;
}

export function userCode(user: UserSummary | undefined, fallbackId: string | undefined) {
  return user?.userId?.trim() || fallbackId?.trim() || "";
}

export function displayItemName(item: StockRequestItem) {
  const detail = item.item as NamedItem | undefined;
  return detail?.itemName?.trim()
    || detail?.displayName?.trim()
    || detail?.name?.trim()
    || detail?.productName?.trim()
    || "ไม่พบชื่อสินค้า";
}

export function displayStatus(value: string | undefined) {
  return statusText[value ?? ""] ?? value ?? "ไม่พบสถานะ";
}

export function DocumentStatusBadge({ status }: { status: string | undefined }) {
  return <span className={`document-status document-status--${(status || "unknown").toLowerCase()}`}>{displayStatus(status)}</span>;
}
