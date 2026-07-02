import { describe, expect, it } from "vitest";
import { normalizeImageUrl } from "./image-url";

describe("normalizeImageUrl", () => {
  it("trims and normalizes local item paths", () => expect(normalizeImageUrl(" images/items/red-pork.webp ")).toBe("/images/items/red-pork.webp"));
  it("supports HTTPS png, jpg and jpeg URLs", () => {
    expect(normalizeImageUrl("https://cdn.example.test/a.png")).toBe("https://cdn.example.test/a.png");
    expect(normalizeImageUrl("https://cdn.example.test/a.JPG")).toBe("https://cdn.example.test/a.JPG");
    expect(normalizeImageUrl("https://cdn.example.test/a.jpeg")).toBe("https://cdn.example.test/a.jpeg");
  });
  it("rejects unsupported and insecure URLs", () => {
    expect(normalizeImageUrl("http://example.test/a.webp")).toBe("");
    expect(normalizeImageUrl("/images/items/a.svg")).toBe("");
  });
});
