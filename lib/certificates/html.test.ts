import { describe, expect, it } from "vitest";
import { buildCertificateHtml, type CertificateHtmlInput } from "./html";

const baseInput: CertificateHtmlInput = {
  recipientName: "Jordan Lee",
  organizationName: "Northstar Learning",
  programName: "Design Systems Workshop",
  completionDateLabel: "August 14, 2026",
  certificatePublicId: "CG-AB12CD34",
  templateKey: "modern",
  accent: "#1f6f4a",
  qrDataUri: "data:image/png;base64,AAAA",
};

describe("buildCertificateHtml", () => {
  it("includes all recipient and program details", () => {
    const html = buildCertificateHtml(baseInput);
    expect(html).toContain("Jordan Lee");
    expect(html).toContain("Northstar Learning");
    expect(html).toContain("Design Systems Workshop");
    expect(html).toContain("August 14, 2026");
    expect(html).toContain("CG-AB12CD34");
    expect(html).toContain('data-template="modern"');
    expect(html).toContain("data:image/png;base64,AAAA");
  });

  it("escapes HTML in recipient- and form-controlled fields", () => {
    const html = buildCertificateHtml({
      ...baseInput,
      recipientName: "<script>alert(1)</script>",
      programName: 'A & B "Program"',
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("A &amp; B &quot;Program&quot;");
  });

  it("falls back to the default accent for an invalid color value", () => {
    const html = buildCertificateHtml({ ...baseInput, accent: "javascript:alert(1)" });
    expect(html).toContain("--certificate-accent: #1f6f4a");
    expect(html).not.toContain("javascript:alert(1)");
  });

  it("accepts a valid 6-digit hex accent unchanged", () => {
    const html = buildCertificateHtml({ ...baseInput, accent: "#9a5b32" });
    expect(html).toContain("--certificate-accent: #9a5b32");
  });
});
