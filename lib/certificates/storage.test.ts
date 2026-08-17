import { describe, expect, it } from "vitest";
import { buildPdfStoragePath } from "./storage";

describe("buildPdfStoragePath", () => {
  it("namespaces the pdf path by organization and credential id", () => {
    expect(buildPdfStoragePath("org-1", "cred-1")).toBe("org-1/cred-1.pdf");
  });
});
