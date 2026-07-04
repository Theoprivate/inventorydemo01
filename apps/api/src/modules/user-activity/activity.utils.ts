import { createId } from "../../utils/ids.js";

const BANGKOK_TIME_ZONE = "Asia/Bangkok";

export function generateActivityId(): string {
  return createId("ACT");
}

export function generateXpTransactionId(): string {
  return createId("XPT");
}

export function getBangkokDate(value: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const find = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${find("year")}-${find("month")}-${find("day")}`;
}

export function getIsoTimestamp(value: Date = new Date()): string {
  return value.toISOString();
}
