import QRCode from "qrcode";

export async function generateVerificationQrDataUri(verifyUrl: string): Promise<string> {
  return QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });
}
