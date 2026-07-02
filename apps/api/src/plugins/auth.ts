import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Role, SessionUser } from "../models.js";
import { AppError } from "../errors.js";

declare module "@fastify/jwt" { interface FastifyJWT { payload: SessionUser; user: SessionUser } }
declare module "fastify" {
  interface FastifyInstance { authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>; requireRoles(roles: Role[]): (request: FastifyRequest, reply: FastifyReply) => Promise<void> }
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  const secret = process.env.JWT_SECRET?.trim() || process.env.SESSION_SECRET?.trim();
  if (!secret) throw new Error("Missing JWT_SECRET");
  const cookieName = process.env.COOKIE_NAME?.trim() || "restaurant_session";
  await app.register(cookie);
  await app.register(jwt, { secret, cookie: { cookieName, signed: false }, sign: { expiresIn: "1d" } });
  app.decorate("authenticate", async (request) => { try { await request.jwtVerify(); } catch { throw new AppError(401, "UNAUTHORIZED", "กรุณาเข้าสู่ระบบ"); } });
  app.decorate("requireRoles", (roles: Role[]) => async (request) => { await app.authenticate(request, {} as FastifyReply); if (!roles.includes(request.user.role)) throw new AppError(403, "FORBIDDEN", "คุณไม่มีสิทธิ์ใช้งานส่วนนี้"); });
}

export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(process.env.COOKIE_NAME?.trim() || "restaurant_session", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86_400, secure: process.env.NODE_ENV === "production" });
}
export function clearSessionCookie(reply: FastifyReply): void { reply.clearCookie(process.env.COOKIE_NAME?.trim() || "restaurant_session", { path: "/" }); }
