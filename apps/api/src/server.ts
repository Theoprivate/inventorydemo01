import "dotenv/config";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import {
  createHmac,
  createSign,
  timingSafeEqual,
} from "node:crypto";

export interface SheetUser {
  userId: string;
  username: string;
  password: string;
  displayName: string;
  role: string;
  isActive: boolean;
}

export interface SessionUser {
  userId: string;
  username: string;
  displayName: string;
  role: string;
}

interface SessionPayload extends SessionUser {
  exp: number;
}

export interface LoginBody {
  username: string;
  password: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface GoogleSheetValuesResponse {
  range?: string;
  majorDimension?: string;
  values?: string[][];
}

interface CachedAccessToken {
  accessToken: string;
  expiresAt: number;
}

type AuthMode = "local" | "sheets";

const SESSION_COOKIE_NAME = "restaurant_session";
const SESSION_MAX_AGE_SECONDS = 86_400;
const GOOGLE_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets.readonly";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedGoogleAccessToken: CachedAccessToken | null = null;

function getAuthMode(): AuthMode {
  const defaultMode = process.env.NODE_ENV === "production" ? "sheets" : "local";
  const value = (process.env.AUTH_MODE ?? defaultMode).trim().toLowerCase();

  if (value !== "local" && value !== "sheets") {
    throw new Error("AUTH_MODE must be either local or sheets");
  }

  return value;
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;

  return Buffer.from(normalized + "=".repeat(paddingLength), "base64");
}

export function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  return (
    aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)
  );
}

export function signSessionPayload(payloadPart: string): string {
  const secret = requireEnvironmentVariable("SESSION_SECRET");

  return base64UrlEncode(
    createHmac("sha256", secret).update(payloadPart).digest(),
  );
}

export function createSessionToken(user: SessionUser): string {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1_000) + SESSION_MAX_AGE_SECONDS,
  };
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signature = signSessionPayload(payloadPart);

  return `${payloadPart}.${signature}`;
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.userId === "string" &&
    typeof payload.username === "string" &&
    typeof payload.displayName === "string" &&
    typeof payload.role === "string" &&
    typeof payload.exp === "number" &&
    Number.isInteger(payload.exp)
  );
}

export function verifySessionToken(token: string): SessionUser | null {
  const tokenParts = token.split(".");

  if (tokenParts.length !== 2) {
    return null;
  }

  const [payloadPart, signature] = tokenParts;

  if (!payloadPart || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(payloadPart);

  if (!safeEqual(expectedSignature, signature)) {
    return null;
  }

  try {
    const parsedPayload: unknown = JSON.parse(
      base64UrlDecode(payloadPart).toString("utf8"),
    );

    if (
      !isSessionPayload(parsedPayload) ||
      parsedPayload.exp <= Math.floor(Date.now() / 1_000)
    ) {
      return null;
    }

    const { userId, username, displayName, role } = parsedPayload;

    return { userId, username, displayName, role };
  } catch {
    return null;
  }
}

export function getCookie(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const cookieName = cookie.slice(0, separatorIndex).trim();

    if (cookieName !== name) {
      continue;
    }

    const value = cookie.slice(separatorIndex + 1).trim();

    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}

function isGoogleTokenResponse(value: unknown): value is GoogleTokenResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;

  return (
    typeof response.access_token === "string" &&
    typeof response.expires_in === "number" &&
    typeof response.token_type === "string"
  );
}

function isGoogleSheetValuesResponse(
  value: unknown,
): value is GoogleSheetValuesResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;

  return (
    response.values === undefined ||
    (Array.isArray(response.values) &&
      response.values.every(
        (row) =>
          Array.isArray(row) &&
          row.every((cell) => typeof cell === "string"),
      ))
  );
}

function createGoogleServiceAccountAssertion(): string {
  const now = Math.floor(Date.now() / 1_000);
  const headerPart = base64UrlEncode(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  );
  const payloadPart = base64UrlEncode(
    JSON.stringify({
      iss: requireEnvironmentVariable("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
      scope: GOOGLE_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3_600,
    }),
  );
  const unsignedToken = `${headerPart}.${payloadPart}`;
  const privateKey = requireEnvironmentVariable("GOOGLE_PRIVATE_KEY").replace(
    /\\n/g,
    "\n",
  );
  const signer = createSign("RSA-SHA256");

  signer.update(unsignedToken);
  signer.end();

  return `${unsignedToken}.${base64UrlEncode(signer.sign(privateKey))}`;
}

async function getGoogleAccessToken(): Promise<string> {
  const now = Date.now();

  if (
    cachedGoogleAccessToken &&
    cachedGoogleAccessToken.expiresAt - 60_000 > now
  ) {
    return cachedGoogleAccessToken.accessToken;
  }

  const assertion = createGoogleServiceAccountAssertion();
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const responseBody: unknown = await response.json();

  if (!response.ok || !isGoogleTokenResponse(responseBody)) {
    throw new Error(`Unable to obtain Google access token (${response.status})`);
  }

  cachedGoogleAccessToken = {
    accessToken: responseBody.access_token,
    expiresAt: now + responseBody.expires_in * 1_000,
  };

  return responseBody.access_token;
}

async function getSheetUsers(): Promise<SheetUser[]> {
  const spreadsheetId = requireEnvironmentVariable("GOOGLE_SHEET_ID");
  const accessToken = await getGoogleAccessToken();
  const range = encodeURIComponent("Users!A:F");
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId,
  )}/values/${range}`;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const responseBody: unknown = await response.json();

  if (!response.ok || !isGoogleSheetValuesResponse(responseBody)) {
    throw new Error(`Unable to read Google Sheet users (${response.status})`);
  }

  const rows = responseBody.values ?? [];

  return rows.slice(1).flatMap((row): SheetUser[] => {
    const [userId, username, password, displayName, role, isActive] = row;

    if (!userId || !username || password === undefined) {
      return [];
    }

    return [
      {
        userId: userId.trim(),
        username: username.trim(),
        password,
        displayName: displayName?.trim() ?? "",
        role: role?.trim() ?? "",
        isActive: isActive?.trim().toUpperCase() === "TRUE",
      },
    ];
  });
}

function getLocalUsers(): SheetUser[] {
  return [
    {
      userId: process.env.DEV_AUTH_USER_ID?.trim() || "U001",
      username: process.env.DEV_AUTH_USERNAME?.trim() || "admin",
      password: process.env.DEV_AUTH_PASSWORD || "admin123",
      displayName: process.env.DEV_AUTH_DISPLAY_NAME?.trim() || "ผู้ดูแลระบบ",
      role: process.env.DEV_AUTH_ROLE?.trim() || "admin",
      isActive: true,
    },
  ];
}

async function getUsers(): Promise<SheetUser[]> {
  return getAuthMode() === "sheets" ? getSheetUsers() : getLocalUsers();
}

function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(
    token,
  )}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

function clearedSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

function isLoginBody(value: unknown): value is LoginBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const body = value as Record<string, unknown>;

  return typeof body.username === "string" && typeof body.password === "string";
}

export const fastify = Fastify({ logger: true });
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

fastify.addHook(
  "onRequest",
  async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header("Access-Control-Allow-Origin", frontendOrigin);
    reply.header("Access-Control-Allow-Credentials", "true");
    reply.header("Access-Control-Allow-Headers", "Content-Type");
    reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    reply.header("Vary", "Origin");
  },
);

fastify.options("/*", async (_request, reply) => reply.code(204).send());

fastify.get("/health", async () => ({
  ok: true,
  service: "restaurant-api",
  authMode: getAuthMode(),
}));

fastify.post("/auth/login", async (request, reply) => {
  if (!isLoginBody(request.body)) {
    return reply.code(400).send({
      ok: false,
      message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน",
    });
  }

  const username = request.body.username.trim();
  const password = request.body.password;

  if (!username || !password) {
    return reply.code(400).send({
      ok: false,
      message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน",
    });
  }

  try {
    const users = await getUsers();

    // MVP only: production should use hashed passwords and a real database.
    const matchedUser = users.find(
      (user) =>
        user.username === username &&
        user.password === password &&
        user.isActive,
    );

    if (!matchedUser) {
      return reply.code(401).send({
        ok: false,
        message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const user: SessionUser = {
      userId: matchedUser.userId,
      username: matchedUser.username,
      displayName: matchedUser.displayName,
      role: matchedUser.role,
    };
    const token = createSessionToken(user);

    reply.header("Set-Cookie", sessionCookie(token));

    return reply.send({ ok: true, user });
  } catch (error) {
    request.log.error({ error }, "Login failed while loading users");

    return reply.code(502).send({
      ok: false,
      message: "ไม่สามารถเชื่อมต่อข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง",
    });
  }
});

fastify.get("/auth/me", async (request, reply) => {
  const token = getCookie(request.headers.cookie, SESSION_COOKIE_NAME);

  if (!token) {
    return reply.code(401).send({ ok: false, message: "กรุณาเข้าสู่ระบบ" });
  }

  try {
    const user = verifySessionToken(token);

    if (!user) {
      reply.header("Set-Cookie", clearedSessionCookie());
      return reply.code(401).send({ ok: false, message: "เซสชันไม่ถูกต้อง" });
    }

    return reply.send({ ok: true, user });
  } catch (error) {
    request.log.error({ error }, "Session verification failed");
    reply.header("Set-Cookie", clearedSessionCookie());

    return reply.code(401).send({ ok: false, message: "เซสชันไม่ถูกต้อง" });
  }
});

fastify.post("/auth/logout", async (_request, reply) => {
  reply.header("Set-Cookie", clearedSessionCookie());

  return reply.send({ ok: true });
});

async function start(): Promise<void> {
  const rawPort = process.env.PORT ?? "4000";
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  try {
    await fastify.listen({ port, host: "0.0.0.0" });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  void start();
}
