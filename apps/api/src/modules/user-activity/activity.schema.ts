import { z } from "zod";
import { ACTIVITY_ACTIONS } from "./activity.types.js";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD");
export const activityLimitSchema = z.coerce.number().int().min(1).max(100).default(20);

export const meActivitiesQuerySchema = z.object({ limit: activityLimitSchema });

export const activityLogQuerySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  branchId: z.string().trim().min(1).optional(),
  action: z.enum(ACTIVITY_ACTIONS).optional(),
  dateFrom: date.optional(),
  dateTo: date.optional(),
  limit: activityLimitSchema,
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
  message: "dateFrom ต้องไม่เกิน dateTo",
  path: ["dateTo"],
});
