import { describe, expect, it } from "vitest";
import { buildCertificatePdf } from "./build-certificate";

describe("buildCertificatePdf", () => {
  it("renders a complete certificate to a valid PDF", async () => {
    const buffer = await buildCertificatePdf({
      recipientName: "Jordan Lee",
      organizationName: "Northstar Learning",
      programName: "Design Systems Workshop",
      completionDateLabel: "August 14, 2026",
      certificatePublicId: "CG-AB12CD34",
      templateKey: "modern",
      accent: "#1f6f4a",
      verifyUrl: "https://certigen.example.com/verify/CG-AB12CD34",
    });
    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
  }, 30_000);
});
