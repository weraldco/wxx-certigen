import { describe, expect, it } from "vitest";
import { generateVerificationQrDataUri } from "./qr";

describe("generateVerificationQrDataUri", () => {
  it("returns a PNG data URI", async () => {
    const dataUri = await generateVerificationQrDataUri("https://certigen.example.com/verify/CG-AB12CD34");
    expect(dataUri.startsWith("data:image/png;base64,")).toBe(true);
    expect(dataUri.length).toBeGreaterThan(100);
  });

  it("produces different output for different URLs", async () => {
    const first = await generateVerificationQrDataUri("https://certigen.example.com/verify/CG-AAAAAAAA");
    const second = await generateVerificationQrDataUri("https://certigen.example.com/verify/CG-BBBBBBBB");
    expect(first).not.toBe(second);
  });
});
