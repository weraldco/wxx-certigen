export type CertificateTemplateKey = "modern" | "academic" | "editorial" | "minimal";

export type CertificateHtmlInput = {
  recipientName: string;
  organizationName: string;
  programName: string;
  completionDateLabel: string;
  certificatePublicId: string;
  templateKey: CertificateTemplateKey;
  accent: string;
  qrDataUri: string;
};

const DEFAULT_ACCENT = "#1f6f4a";
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function sanitizeAccent(accent: string): string {
  return HEX_COLOR_PATTERN.test(accent) ? accent : DEFAULT_ACCENT;
}

const CERTIFICATE_STYLES = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
  @page { size: A4 landscape; margin: 0; }
  .certificate { --certificate-accent: #1f6f4a; position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; color: #28372f; background-color: #fff; text-align: center; }
  .certificate::before, .certificate::after { content: ""; position: absolute; width: 90px; height: 90px; border: 1px solid color-mix(in srgb, var(--certificate-accent) 30%, white); transform: rotate(45deg); }
  .certificate::before { left: -61px; top: -61px; }
  .certificate::after { right: -61px; bottom: -61px; }
  .certificate-rule { position: absolute; inset: 24px; border: 1px solid color-mix(in srgb, var(--certificate-accent) 58%, white); }
  .certificate-brand { position: absolute; top: 40px; left: 48px; display: flex; align-items: center; gap: 8px; color: #415149; font-size: 12px; font-weight: 650; }
  .certificate-brand .brand-mark { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 7px; color: var(--certificate-accent); background: #eff4f1; font-size: 12px; font-weight: 800; }
  .certificate-label { margin-bottom: 28px; color: var(--certificate-accent); font-family: 'Geist Mono', ui-monospace, monospace; font-size: 13px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; }
  .certificate p { margin: 0; color: #758079; font-size: 13px; }
  .certificate h2 { margin: 14px 0 14px; color: #17231d; font-size: 52px; font-weight: 530; letter-spacing: -.05em; line-height: 1; }
  .certificate h3 { margin: 10px 0 0; color: var(--certificate-accent); font-size: 22px; font-weight: 640; letter-spacing: -.025em; }
  .certificate-footer { position: absolute; right: 64px; bottom: 40px; left: 64px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 24px; }
  .certificate-footer > span:not(.certificate-seal) { display: grid; gap: 6px; padding-top: 6px; border-top: 1px solid #aeb9b2; }
  .certificate-footer strong { font-size: 11px; font-weight: 600; }
  .certificate-footer small { color: #8a948e; font-size: 8px; text-transform: uppercase; letter-spacing: .12em; }
  .certificate-seal { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; color: #fff; background: var(--certificate-accent); font-size: 20px; }
  .certificate-qr { position: absolute; right: 40px; top: 40px; width: 72px; height: 72px; border: 1px solid #e2e6e3; border-radius: 6px; background: #fff; padding: 4px; }
  .certificate[data-template="academic"] .certificate-rule { inset: 18px; border: 3px double var(--certificate-accent); }
  .certificate[data-template="academic"] h2 { font-family: Georgia, serif; font-weight: 500; }
  .certificate[data-template="academic"]::before, .certificate[data-template="academic"]::after { border-radius: 50%; }
  .certificate[data-template="editorial"] { align-items: flex-start; padding-left: 18%; text-align: left; }
  .certificate[data-template="editorial"] .certificate-rule { inset: 0 auto 0 0; width: 9%; border: 0; background: var(--certificate-accent); }
  .certificate[data-template="editorial"] .certificate-brand { left: 18%; }
  .certificate[data-template="editorial"] .certificate-footer { left: 18%; }
  .certificate[data-template="editorial"] h2 { font-size: 60px; }
  .certificate[data-template="editorial"]::before, .certificate[data-template="editorial"]::after { display: none; }
  .certificate[data-template="minimal"] .certificate-rule { inset: 32px; border-width: 1px 0 0; }
  .certificate[data-template="minimal"] .certificate-label { color: #66736c; }
  .certificate[data-template="minimal"]::before, .certificate[data-template="minimal"]::after { display: none; }
`;

export function buildCertificateHtml(input: CertificateHtmlInput): string {
  const accent = sanitizeAccent(input.accent);
  const recipientName = escapeHtml(input.recipientName);
  const organizationName = escapeHtml(input.organizationName);
  const programName = escapeHtml(input.programName);
  const completionDateLabel = escapeHtml(input.completionDateLabel);
  const certificatePublicId = escapeHtml(input.certificatePublicId);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>${CERTIFICATE_STYLES}</style>
</head>
<body>
<div class="certificate" data-template="${input.templateKey}" style="--certificate-accent: ${accent}">
<div class="certificate-rule"></div>
<div class="certificate-brand"><span class="brand-mark">C</span><span>${organizationName}</span></div>
<span class="certificate-label">Certificate of completion</span>
<p>This certificate is proudly presented to</p>
<h2>${recipientName}</h2>
<p>for successfully completing</p>
<h3>${programName}</h3>
<div class="certificate-footer">
<span><strong>${completionDateLabel}</strong><small>Date issued</small></span>
<span class="certificate-seal">&#10003;</span>
<span><strong>${certificatePublicId}</strong><small>Certificate ID</small></span>
</div>
<img class="certificate-qr" src="${input.qrDataUri}" alt="Verification QR code" />
</div>
</body>
</html>`;
}
