import type { Browser } from "puppeteer-core";

export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const { default: puppeteer } = await import("puppeteer");
  return puppeteer.launch({ headless: true }) as unknown as Browser;
}

/**
 * Renders HTML to a certificate PDF. If a `browser` is provided, it is reused
 * (only the page is closed afterward) so a caller processing many certificates
 * in one invocation can launch Chromium once and render a whole batch with it.
 * If no `browser` is provided, one is launched and closed for this call alone,
 * preserving the original single-call behavior.
 */
export async function renderCertificatePdf(html: string, browser?: Browser): Promise<Buffer> {
  const ownedBrowser = browser ?? (await launchBrowser());
  try {
    const page = await ownedBrowser.newPage();
    try {
      await page.setViewport({ width: 1414, height: 1000 });
      await page.setContent(html, { waitUntil: "load" });
      const pdfBytes = await page.pdf({ format: "a4", landscape: true, printBackground: true });
      return Buffer.from(pdfBytes);
    } finally {
      await page.close();
    }
  } finally {
    if (!browser) await ownedBrowser.close();
  }
}
