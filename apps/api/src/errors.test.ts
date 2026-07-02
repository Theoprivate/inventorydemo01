import { describe, expect, it } from "vitest";
import { sheetsWriteError } from "./errors.js";

describe("Google API error mapping", () => {
  it("maps 403 to an Editor permission message", () => expect(sheetsWriteError({ response: { status: 403 } })).toMatchObject({ statusCode: 403, code: "SHEETS_WRITE_FAILED", googleStatus: 403 }));
  it("maps other failures without exposing upstream details", () => { const error = sheetsWriteError(new Error("private upstream detail")); expect(error).toMatchObject({ statusCode: 502, code: "SHEETS_WRITE_FAILED" }); expect(error.message).not.toContain("private upstream detail"); });
});
