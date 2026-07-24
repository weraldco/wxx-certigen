"use client";

import { EnvelopeSimple, SealCheck } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the sign-in link.");
      setStatus("error");
    }
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="login-brand"><span className="login-mark">C<SealCheck weight="fill" /></span><strong>CertiGen</strong></div>
        <div>
          <span className="login-kicker">Credential operations</span>
          <h1>Issue proof that lasts.</h1>
          <p>Connect completion data, publish verified certificates, and keep every credential accountable.</p>
        </div>
        <small>Private recipient data. Public proof only.</small>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={sendMagicLink}>
          <span className="login-icon"><EnvelopeSimple /></span>
          <h2>{status === "sent" ? "Check your inbox" : "Sign in to your workspace"}</h2>
          <p>{status === "sent" ? `We sent a secure sign-in link to ${email}.` : "Enter your email and we will send you a password-free sign-in link."}</p>
          {status !== "sent" ? (
            <label className="field">
              <span className="field-label">Work email</span>
              <input type="email" required autoComplete="email" placeholder="you@organization.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
          ) : null}
          {status === "error" ? <span className="login-error">{message}</span> : null}
          {status !== "sent" ? <button className="button primary" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending link..." : "Email me a sign-in link"}</button> : <button className="button secondary" type="button" onClick={() => setStatus("idle")}>Use another email</button>}
        </form>
      </section>
    </main>
  );
}
