export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly googleStatus?: number,
  ) { super(message); }
}

export function googleApiStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { code?: unknown; response?: { status?: unknown } };
  const status = value.response?.status ?? value.code;
  return typeof status === "number" ? status : undefined;
}

export function sheetsWriteError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const status = googleApiStatus(error);
  if (status === 403) {
    return new AppError(403, "SHEETS_WRITE_FAILED", "ระบบไม่มีสิทธิ์เขียน Google Sheets กรุณาแชร์ชีทให้ Service Account เป็น Editor", status);
  }
  return new AppError(502, "SHEETS_WRITE_FAILED", "ไม่สามารถบันทึกคำขอลง Google Sheets ได้ กรุณาลองใหม่", status);
}
