import { afterEach, describe, expect, it, vi } from "vitest";

import { get } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api error handling", () => {
  it("classifies a non-JSON server failure as an unavailable backend and logs safe diagnostics", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("upstream connect error: internal detail", {
      status: 500,
      statusText: "Internal Server Error",
      headers: { "content-type": "text/plain" },
    })));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(get("/requestable-items?branch=private-value")).rejects.toEqual(expect.objectContaining({
      code: "BACKEND_UNAVAILABLE",
      message: "ระบบหลังบ้านไม่พร้อมใช้งาน กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ",
      status: 500,
    }));
    expect(consoleError).toHaveBeenCalledWith("[api] Request failed", {
      method: "GET",
      target: "/requestable-items",
      status: 500,
      statusText: "Internal Server Error",
      contentType: "text/plain",
      classification: "BACKEND_UNAVAILABLE",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("internal detail");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("private-value");
  });

  it("preserves a structured API error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      error: { code: "FORBIDDEN_BRANCH", message: "ไม่สามารถเข้าถึงสาขานี้ได้" },
    }, { status: 403 })));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(get("/requestable-items")).rejects.toEqual(expect.objectContaining({
      code: "FORBIDDEN_BRANCH",
      message: "ไม่สามารถเข้าถึงสาขานี้ได้",
      status: 403,
    }));
  });

  it.each([
    { error: {} },
    { error: "untrusted gateway detail" },
    { error: { message: "internal upstream detail" } },
    { error: { code: "   ", message: "internal upstream detail" } },
  ])("classifies malformed or partial JSON server errors as an unavailable backend", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body, { status: 502, statusText: "Bad Gateway" })));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(get("/requestable-items")).rejects.toEqual(expect.objectContaining({
      code: "BACKEND_UNAVAILABLE",
      message: "ระบบหลังบ้านไม่พร้อมใช้งาน กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ",
      status: 502,
    }));
    expect(consoleError).toHaveBeenCalledWith("[api] Request failed", expect.objectContaining({
      classification: "BACKEND_UNAVAILABLE",
      status: 502,
    }));
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("internal upstream detail");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("untrusted gateway detail");
  });

  it("preserves a coded structured server error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      error: { code: "SHEETS_UNAVAILABLE", message: "ไม่สามารถอ่านข้อมูลสต๊อกได้" },
    }, { status: 503 })));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(get("/requestable-items")).rejects.toEqual(expect.objectContaining({
      code: "SHEETS_UNAVAILABLE",
      message: "ไม่สามารถอ่านข้อมูลสต๊อกได้",
      status: 503,
    }));
    expect(consoleError).toHaveBeenCalledWith("[api] Request failed", expect.objectContaining({
      classification: "SHEETS_UNAVAILABLE",
      status: 503,
    }));
  });

  it("classifies fetch failures as network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(get("/requestable-items")).rejects.toEqual(expect.objectContaining({
      code: "NETWORK_ERROR",
      status: 0,
    }));
    expect(consoleError).toHaveBeenCalledWith("[api] Request failed", expect.objectContaining({
      method: "GET",
      target: "/requestable-items",
      classification: "NETWORK_ERROR",
    }));
  });
});
