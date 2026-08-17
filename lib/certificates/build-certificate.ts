import type { Browser } from "puppeteer-core";
import { buildCertificateHtml, type CertificateTemplateKey } from "./html";
import { generateVerificationQrDataUri } from "./qr";
import { renderCertificatePdf } from "./pdf";

export type BuildCertificatePdfInput = {
  recipientName: string;
  organizationName: string;
  programName: string;
  completionDateLabel: string;
  certificatePublicId: string;
  templateKey: CertificateTemplateKey;
  accent: string;
  verifyUrl: string;
};

/**
 * Builds a single certificate PDF. An optional `browser` can be passed in
 * (e.g. by a batch worker) so Chromium is launched once and reused across
 * many certificates instead of once per call.
 */
export async function buildCertificatePdf(input: BuildCertificatePdfInput, browser?: Browser): Promise<Buffer> {
  const qrDataUri = await generateVerificationQrDataUri(input.verifyUrl);
  const html = buildCertificateHtml({
    recipientName: input.recipientName,
    organizationName: input.organizationName,
    programName: input.programName,
    completionDateLabel: input.completionDateLabel,
    certificatePublicId: input.certificatePublicId,
    templateKey: input.templateKey,
    accent: input.accent,
    qrDataUri,
  });
  return renderCertificatePdf(html, browser);
}
