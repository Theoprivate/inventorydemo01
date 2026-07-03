import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PixelCartButton } from "./pixel-cart-button";

describe("PixelCartButton", () => {
  it("renders a centered count badge and accessible cart label", () => {
    const markup = renderToStaticMarkup(<PixelCartButton count={3} onClick={() => undefined} />);
    expect(markup).toContain("เปิดรถเข็นเบิกของ");
    expect(markup).toContain("fixed");
    expect(markup).toContain("right-4");
    expect(markup).toContain("bottom-[calc(4.75rem+env(safe-area-inset-bottom))]");
    expect(markup).toContain("lg:bottom-7");
    expect(markup).toContain("market-cart-button");
    expect(markup).toContain("z-[45]");
    expect(markup).toContain("min-w-7");
    expect(markup).toContain(">3<");
  });

  it("does not render while the cart drawer is open", () => {
    expect(renderToStaticMarkup(<PixelCartButton count={3} hidden onClick={() => undefined} />)).toBe("");
  });
});
