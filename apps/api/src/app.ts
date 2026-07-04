import cors from "@fastify/cors";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { AppError } from "./errors.js";
import type { Role } from "./models.js";
import { clearSessionCookie, registerAuth, setSessionCookie } from "./plugins/auth.js";
import type { InventoryRepository } from "./repositories/inventory-repository.js";
import { InventoryService } from "./services/inventory-service.js";

const roles = ["owner", "manager", "stock", "staff"] as const;
const masterRoles: Role[] = ["owner", "manager"];
const stockRoles: Role[] = ["owner", "manager", "stock"];
const ok = <T>(data: T) => ({ ok: true as const, data });
const paramsWith = (key: string) => z.object({ [key]: z.string().min(1) });
const boolean = z.boolean();

export async function buildApp(repository: InventoryRepository): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  const service = new InventoryService(repository);
  const origins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000").split(",").map((v) => v.trim()).filter(Boolean);
  await app.register(cors, { credentials: true, origin: (origin, callback) => callback(null, isAllowedOrigin(origin, origins)) });
  await registerAuth(app);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      request.log.warn({ requestId: request.id, route: request.routeOptions.url, statusCode: 400, errorCode: "VALIDATION_ERROR" }, "Request validation failed");
      return reply.code(400).send({ ok: false, error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" } });
    }
    if (error instanceof AppError) {
      request.log.error({ requestId: request.id, route: request.routeOptions.url, statusCode: error.statusCode, errorCode: error.code, googleStatus: error.googleStatus }, "Request failed");
      return reply.code(error.statusCode).send({ ok: false, error: { code: error.code, message: error.message } });
    }
    request.log.error({ requestId: request.id, route: request.routeOptions.url, statusCode: 500, errorCode: "INTERNAL_ERROR" }, "Request failed");
    return reply.code(500).send({ ok: false, error: { code: "INTERNAL_ERROR", message: "ระบบขัดข้อง กรุณาลองใหม่" } });
  });

  const loginSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });
  const login = async (request: FastifyRequest, reply: FastifyReply) => { const body = loginSchema.parse(request.body); const user = await service.login(body.username, body.password); if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"); const token = await reply.jwtSign(user); setSessionCookie(reply, token); return ok(user); };
  const logout = async (_request: FastifyRequest, reply: FastifyReply) => { clearSessionCookie(reply); return ok({ loggedOut: true }); };
  const me = async (request: FastifyRequest) => ok(request.user);

  for (const prefix of ["", "/api/v1"]) {
    app.post(`${prefix}/auth/login`, login);
    app.post(`${prefix}/auth/logout`, { preHandler: app.authenticate }, logout);
    app.get(`${prefix}/auth/me`, { preHandler: app.authenticate }, me);
  }

  const auth = { preHandler: app.authenticate };
  const master = { preHandler: app.requireRoles(masterRoles) };
  const stock = { preHandler: app.requireRoles(stockRoles) };
  const owner = { preHandler: app.requireRoles(["owner"]) };
  const prefix = "/api/v1";

  app.get(`${prefix}/health`, async () => ok({ service: "inventory-api", status: "ready" }));
  app.get(`${prefix}/dashboard`, auth, async (request) => ok(await service.dashboard(request.user)));
  app.get(`${prefix}/branches`, auth, async () => ok(await service.branches()));
  app.get(`${prefix}/categories`, auth, async () => ok(await service.categories()));
  app.get(`${prefix}/items`, auth, async () => ok(await service.items()));
  app.post(`${prefix}/items`, master, async (request) => ok(await service.saveItem(itemSchema.parse(request.body))));
  app.patch(`${prefix}/items/:itemId`, master, async (request) => { const { itemId } = paramsWith("itemId").parse(request.params) as { itemId: string }; return ok(await service.saveItem({ ...itemPatchSchema.parse(request.body), itemId })); });
  app.get(`${prefix}/locations`, auth, async (request) => { const branchId = z.object({ branchId: z.string().optional() }).parse(request.query).branchId; if (branchId && request.user.role !== "owner" && branchId !== request.user.branchId) throw new AppError(403, "BRANCH_FORBIDDEN", "ไม่สามารถดูข้อมูลต่างสาขาได้"); return ok(await service.locations(branchId ?? request.user.branchId)); });
  app.post(`${prefix}/locations`, master, async (request) => ok(await service.saveLocation(request.user, locationSchema.parse(request.body))));
  app.patch(`${prefix}/locations/:locationId`, master, async (request) => { const { locationId } = paramsWith("locationId").parse(request.params) as { locationId: string }; return ok(await service.saveLocation(request.user, { ...locationSchema.partial().parse(request.body), locationId } as z.infer<typeof locationSchema> & { locationId: string })); });
  app.get(`${prefix}/store-items`, auth, async (request) => { const branchId = z.object({ branchId: z.string().optional() }).parse(request.query).branchId ?? request.user.branchId; if (request.user.role !== "owner" && branchId !== request.user.branchId) throw new AppError(403, "BRANCH_FORBIDDEN", "ไม่สามารถดูข้อมูลต่างสาขาได้"); return ok(await service.storeItems(branchId)); });
  app.put(`${prefix}/store-items/batch`, master, async (request) => { const body = storeItemsSchema.parse(request.body); return ok(await service.saveStoreItems(request.user, body.branchId, body.items)); });
  app.get(`${prefix}/requestable-items`, auth, async (request) => ok(await service.requestableItems(request.user)));
  app.get(`${prefix}/stock-balances`, auth, async (request) => ok(await service.balances(request.user.branchId)));
  app.get(`${prefix}/stock-balances/:branchId/:locationId/:itemId`, auth, async (request) => { const params = z.object({ branchId: z.string(), locationId: z.string(), itemId: z.string() }).parse(request.params); if (request.user.role !== "owner" && params.branchId !== request.user.branchId) throw new AppError(403, "BRANCH_FORBIDDEN", "ไม่สามารถดูข้อมูลต่างสาขาได้"); const value = (await service.balances(params.branchId)).find((v) => v.locationId === params.locationId && v.itemId === params.itemId); if (!value) throw new AppError(404, "BALANCE_NOT_FOUND", "ไม่พบยอดคงเหลือ"); return ok(value); });

  app.post(`${prefix}/stock-requests`, auth, async (request) => { const key = z.string().uuid().optional().parse(request.headers["idempotency-key"]); return ok(await service.createRequest(request.user, requestSchema.parse(request.body), key)); });
  app.get(`${prefix}/stock-requests`, auth, async (request) => { const query = z.object({ status: z.string().optional() }).parse(request.query); return ok(await service.requests(request.user, query.status?.split(","))); });
  app.get(`${prefix}/stock-requests/:requestId`, auth, async (request) => { const { requestId } = paramsWith("requestId").parse(request.params) as { requestId: string }; return ok(await service.requestDetail(request.user, requestId)); });
  app.patch(`${prefix}/stock-requests/:requestId`, auth, async (request) => { const { requestId } = paramsWith("requestId").parse(request.params) as { requestId: string }; const action = z.object({ action: z.enum(["cancel"]) }).parse(request.body); return ok(action.action === "cancel" ? await service.cancelRequest(request.user, requestId) : null); });
  app.post(`${prefix}/stock-requests/:requestId/approve`, stock, async (request) => { const { requestId } = paramsWith("requestId").parse(request.params) as { requestId: string }; const body = z.object({ items: z.array(z.object({ requestItemId: z.string(), approvedQty: z.number().min(0) })) }).parse(request.body); return ok(await service.approveRequest(request.user, requestId, body.items)); });
  app.post(`${prefix}/stock-requests/:requestId/issue`, stock, async (request) => { const { requestId } = paramsWith("requestId").parse(request.params) as { requestId: string }; const body = z.object({ items: z.array(z.object({ requestItemId: z.string(), qty: z.number().min(0), fromLocationId: z.string().optional(), toLocationId: z.string().optional() })) }).parse(request.body); return ok(await service.issueRequest(request.user, requestId, body.items)); });
  app.post(`${prefix}/stock-requests/:requestId/quick-issue`, stock, async (request) => { const { requestId } = paramsWith("requestId").parse(request.params) as { requestId: string }; return ok(await service.quickIssueRequest(request.user, requestId)); });
  app.post(`${prefix}/stock-requests/:requestId/reject`, stock, async (request) => { const { requestId } = paramsWith("requestId").parse(request.params) as { requestId: string }; return ok(await service.rejectRequest(request.user, requestId)); });
  app.post(`${prefix}/stock-requests/:requestId/cancel`, auth, async (request) => { const { requestId } = paramsWith("requestId").parse(request.params) as { requestId: string }; return ok(await service.cancelRequest(request.user, requestId)); });

  app.post(`${prefix}/stock-movements`, stock, async (request) => ok(await service.createMovement(request.user, movementSchema.parse(request.body))));
  app.get(`${prefix}/stock-movements`, stock, async (request) => ok(await service.movements(request.user)));
  app.post(`${prefix}/stock-counts`, stock, async (request) => ok(await service.createCount(request.user, countSchema.parse(request.body))));
  app.get(`${prefix}/stock-counts`, stock, async (request) => ok(await service.counts(request.user)));
  app.get(`${prefix}/stock-counts/:countId`, stock, async (request) => { const { countId } = paramsWith("countId").parse(request.params) as { countId: string }; const value = (await service.counts(request.user)).find((v) => v.countId === countId); if (!value) throw new AppError(404, "COUNT_NOT_FOUND", "ไม่พบการนับสต๊อก"); return ok(value); });
  app.post(`${prefix}/admin/rebuild-stock-balances`, owner, async (request) => ok(await service.rebuildBalances(request.user)));
  return app;
}

const imageUrlSchema = z.string().trim().refine((value) => !value || ((value.startsWith("/") || /^https:\/\//i.test(value)) && /\.(?:webp|png|jpe?g)(?:[?#].*)?$/i.test(value)), "Image URL ต้องเป็น local path ที่ขึ้นต้นด้วย / หรือ HTTPS URL ของไฟล์ webp, png, jpg, jpeg");
const itemSchema = z.object({ itemName: z.string().trim().min(1), categoryId: z.string().trim().min(1), unit: z.string().trim().min(1), imageUrl: imageUrlSchema.default(""), description: z.string().trim().default(""), isActive: boolean.default(true) });
const itemPatchSchema = z.object({ itemName: z.string().trim().min(1).optional(), categoryId: z.string().trim().min(1).optional(), unit: z.string().trim().min(1).optional(), imageUrl: imageUrlSchema.optional(), description: z.string().trim().optional(), isActive: boolean.optional() });
const locationSchema = z.object({ locationName: z.string().trim().min(1), locationType: z.enum(["WAREHOUSE", "FRIDGE", "KITCHEN", "COUNTER", "STORAGE"]), branchId: z.string().optional(), isActive: boolean.default(true) });
const storeItemsSchema = z.object({ branchId: z.string().min(1), items: z.array(z.object({ itemId: z.string().min(1), minQty: z.number().min(0), targetQty: z.number().min(0), defaultLocationId: z.string(), allowRequest: boolean, requireDailyCount: boolean, isActive: boolean })) });
export const requestSchema = z.object({ note: z.string().trim().max(500).optional(), items: z.array(z.object({ itemId: z.string().trim().min(1), requestedQty: z.number().positive(), unit: z.string().trim().min(1), note: z.string().trim().max(500).optional() })).min(1, "กรุณาเลือกสินค้าอย่างน้อยหนึ่งรายการ") });
const movementSchema = z.object({ movementId: z.string().optional(), itemId: z.string().min(1), movementType: z.enum(["RECEIVE", "ISSUE", "TRANSFER", "WASTE", "RETURN", "ADJUSTMENT"]), fromLocationId: z.string().optional(), toLocationId: z.string().optional(), qty: z.number().positive(), unit: z.string().min(1), note: z.string().optional(), adjustmentDirection: z.enum(["increase", "decrease"]).optional(), overrideNegative: z.boolean().optional() });
const countSchema = z.object({ locationId: z.string().min(1), countRound: z.enum(["OPENING", "MIDDAY", "CLOSING", "ADHOC"]), status: z.enum(["DRAFT", "COMPLETED"]), note: z.string().optional(), items: z.array(z.object({ itemId: z.string(), countedQty: z.number().min(0), unit: z.string(), note: z.string().optional() })).min(1) });

export function isAllowedOrigin(origin: string | undefined, configured: string[]): boolean {
  if (!origin || configured.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && /(?:^|\.)app\.github\.dev$/i.test(url.hostname);
  } catch { return false; }
}
