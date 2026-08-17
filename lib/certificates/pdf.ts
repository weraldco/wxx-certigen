import type { Browser } from "puppeteer-core";

async function launchBrowser(): Promise<Browser> {
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

export async function renderCertificatePdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1414, height: 1000 });
    await page.setContent(html, { waitUntil: "load" });
    const pdfBytes = await page.pdf({ format: "a4", landscape: true, printBackground: true });
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}
