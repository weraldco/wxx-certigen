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

export async function buildCertificatePdf(input: BuildCertificatePdfInput): Promise<Buffer> {
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
  return renderCertificatePdf(html);
}
