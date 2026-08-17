import { describe, expect, it } from "vitest";
import { renderCertificatePdf } from "./pdf";

describe("renderCertificatePdf", () => {
  it("produces a valid PDF buffer from HTML", async () => {
    const buffer = await renderCertificatePdf("<html><body><h1>Test</h1></body></html>");
    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
  }, 30_000);
});
