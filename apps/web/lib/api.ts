const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

export class ApiError extends Error { constructor(public readonly code: string, message: string, public readonly status: number) { super(message); } }

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, credentials: "include", headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  } catch {
    throw new ApiError("NETWORK_ERROR", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่", 0);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = typeof body === "object" && body && "error" in body ? (body as { error?: { code?: string; message?: string } }).error : undefined;
    const fallback = response.status === 401 ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" : response.status === 403 ? "คุณไม่มีสิทธิ์ดำเนินการนี้" : "ระบบขัดข้อง กรุณาลองใหม่";
    throw new ApiError(error?.code ?? "REQUEST_FAILED", error?.message ?? fallback, response.status);
  }
  if (typeof body !== "object" || !body || !("data" in body)) throw new ApiError("INVALID_RESPONSE", "รูปแบบข้อมูลจากระบบไม่ถูกต้อง", response.status);
  return (body as { data: T }).data;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, data?: unknown, headers?: HeadersInit) => api<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data), headers });
export const patch = <T>(path: string, data: unknown) => api<T>(path, { method: "PATCH", body: JSON.stringify(data) });
export const put = <T>(path: string, data: unknown) => api<T>(path, { method: "PUT", body: JSON.stringify(data) });
