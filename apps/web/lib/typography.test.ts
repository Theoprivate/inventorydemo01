import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");
const itemsPage = readFileSync("app/(protected)/settings/items/page.tsx", "utf8");

function rule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))?.[1] ?? "";
}

describe("shared typography scale", () => {
  it.each([
    "--font-size-xs",
    "--font-size-sm",
    "--font-size-base",
    "--font-size-lg",
    "--font-size-xl",
    "--line-height-thai",
    "--font-weight-medium",
    "--font-weight-semibold",
    "--font-weight-bold",
  ])("defines %s as a central token", (token) => {
    expect(css).toContain(`${token}:`);
  });

  it("uses the requested page heading hierarchy", () => {
    expect(rule(".page-market-header__title")).toContain("font-size: var(--font-size-page-title)");
    expect(rule(".page-market-header__title")).toContain("line-height: 1.25");
    expect(rule(".page-market-header__description")).toContain("font-size: var(--font-size-base)");
    expect(rule(".page-market-header__description")).toContain("line-height: 1.6");
    expect(rule(".page-market-header__eyebrow")).toContain("letter-spacing: .14em");
  });

  it("keeps Thai item names readable without a fixed-height or truncation class", () => {
    const itemNameRule = rule(".item-card__name");
    expect(itemNameRule).toContain("font-size: var(--font-size-lg)");
    expect(itemNameRule).toContain("line-height: 1.45");
    expect(itemNameRule).not.toMatch(/(?:^|;)\s*height:/);
    expect(itemsPage).toContain('className="item-card__name"');
    expect(itemsPage).not.toContain("mt-2 truncate text-lg");
  });

  it("uses 14px semibold text for buttons and sidebar items", () => {
    expect(rule(".game-button")).toContain("font-size: var(--font-size-sm)");
    expect(rule(".game-button")).toContain("font-weight: var(--font-weight-semibold)");
    expect(rule(".market-nav")).toContain("font-size: var(--font-size-sm)");
    expect(rule(".market-nav")).toContain("font-weight: var(--font-weight-semibold)");
  });
});
