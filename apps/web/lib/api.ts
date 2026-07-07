const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

export class ApiError extends Error { constructor(public readonly code: string, message: string, public readonly status: number) { super(message); } }

function requestTarget(path: string) {
  return path.split(/[?#]/, 1)[0];
}

function logRequestFailure(details: Record<string, unknown>) {
  // Do not log request headers, payloads, cookies, or response bodies here.
  console.error("[api] Request failed", details);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? "GET";
  const target = requestTarget(path);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, credentials: "include", headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  } catch (cause) {
    logRequestFailure({ method, target, classification: "NETWORK_ERROR", causeName: cause instanceof Error ? cause.name : "UnknownError" });
    throw new ApiError("NETWORK_ERROR", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่", 0);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const rawError = typeof body === "object" && body && "error" in body ? (body as { error?: unknown }).error : undefined;
    const error = typeof rawError === "object"
      && rawError
      && "code" in rawError
      && typeof rawError.code === "string"
      && rawError.code.trim()
      ? {
          code: rawError.code,
          message: "message" in rawError && typeof rawError.message === "string" && rawError.message.trim() ? rawError.message : undefined,
        }
      : undefined;
    const upstreamUnavailable = response.status >= 500 && error === undefined;
    const code = error?.code ?? (upstreamUnavailable ? "BACKEND_UNAVAILABLE" : "REQUEST_FAILED");
    const fallback = response.status === 401
      ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"
      : response.status === 403
        ? "คุณไม่มีสิทธิ์ดำเนินการนี้"
        : upstreamUnavailable
          ? "ระบบหลังบ้านไม่พร้อมใช้งาน กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ"
          : "ระบบขัดข้อง กรุณาลองใหม่";
    logRequestFailure({
      method,
      target,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      classification: code,
    });
    throw new ApiError(code, error?.message ?? fallback, response.status);
  }
  if (typeof body !== "object" || !body || !("data" in body)) {
    logRequestFailure({ method, target, status: response.status, contentType: response.headers.get("content-type"), classification: "INVALID_RESPONSE" });
    throw new ApiError("INVALID_RESPONSE", "รูปแบบข้อมูลจากระบบไม่ถูกต้อง", response.status);
  }
  return (body as { data: T }).data;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, data?: unknown, headers?: HeadersInit) => api<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data), headers });
export const patch = <T>(path: string, data: unknown) => api<T>(path, { method: "PATCH", body: JSON.stringify(data) });
export const put = <T>(path: string, data: unknown) => api<T>(path, { method: "PUT", body: JSON.stringify(data) });
