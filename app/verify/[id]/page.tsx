import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle, MagnifyingGlass, SealCheck, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { getPublicCredential } from "@/lib/credentials";

type VerificationPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: VerificationPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Verify ${id.toUpperCase()} | CertiGen` };
}

export default async function VerificationPage({ params }: VerificationPageProps) {
  const { id } = await params;
  let credential = null;
  let unavailable = false;

  try {
    credential = await getPublicCredential(id);
  } catch {
    unavailable = true;
  }

  if (unavailable) {
    return (
      <main className="verification-page">
        <VerificationBrand />
        <section className="verification-card verification-empty">
          <WarningCircle weight="fill" />
          <h1>Verification is temporarily unavailable</h1>
          <p>The verification service is not configured or could not be reached. Please try again later.</p>
        </section>
      </main>
    );
  }

  if (!credential) {
    return (
      <main className="verification-page">
        <VerificationBrand />
        <section className="verification-card verification-empty">
          <MagnifyingGlass />
          <span className="verification-label">Credential not found</span>
          <h1>We could not verify this ID</h1>
          <p>Check the credential ID and make sure the full verification link was entered.</p>
          <code>{id.toUpperCase()}</code>
        </section>
      </main>
    );
  }

  const active = credential.status === "active";
  const issued = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(credential.issued_at));

  return (
    <main className="verification-page">
      <VerificationBrand />
      <section className={`verification-card ${active ? "is-active" : "is-invalid"}`}>
        <div className="verification-status">
          {active ? <CheckCircle weight="fill" /> : <WarningCircle weight="fill" />}
          <span><strong>{active ? "Verified credential" : `Credential ${credential.status}`}</strong><small>{active ? "This record is active and authentic." : "This credential is no longer valid."}</small></span>
        </div>
        <div className="verification-recipient">
          <span className="verification-label">Issued to</span>
          <h1>{credential.recipient_name}</h1>
          <p>{credential.program_name}</p>
        </div>
        <dl className="verification-details">
          <div><dt>Issued by</dt><dd>{credential.organization_name}</dd></div>
          <div><dt>Issue date</dt><dd>{issued}</dd></div>
          <div><dt>Credential ID</dt><dd>{credential.public_id}</dd></div>
          {!active && credential.revocation_reason ? <div><dt>Status reason</dt><dd>{credential.revocation_reason}</dd></div> : null}
        </dl>
        <div className="verification-foot"><SealCheck weight="fill" /><span>Verified against the issuer&apos;s permanent credential record.</span></div>
      </section>
    </main>
  );
}

function VerificationBrand() {
  return (
    <header className="verification-brand">
      <Link href="/"><ArrowLeft /> CertiGen</Link>
      <span>Public verification</span>
    </header>
  );
}
