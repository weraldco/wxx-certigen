"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle,
  ClipboardText,
  EnvelopeSimple,
  FileText,
  GearSix,
  GoogleLogo,
  House,
  LinkSimple,
  PaperPlaneTilt,
  Question,
  SealCheck,
  Sparkle,
  UserCircle,
  Users,
  X,
} from "@phosphor-icons/react";
import { FormEvent, ReactNode, useState } from "react";

const steps = [
  { label: "Program", icon: ClipboardText },
  { label: "Google Form", icon: GoogleLogo },
  { label: "Map fields", icon: LinkSimple },
  { label: "Certificate", icon: FileText },
  { label: "Email & launch", icon: PaperPlaneTilt },
];

const templatePresets = [
  { key: "modern", name: "Modern frame", description: "Crisp, balanced, and versatile", accent: "#1f6f4a" },
  { key: "academic", name: "Academic seal", description: "Formal with a traditional hierarchy", accent: "#284b78" },
  { key: "editorial", name: "Editorial", description: "Expressive type and open space", accent: "#9a5b32" },
  { key: "minimal", name: "Quiet minimal", description: "Understated and contemporary", accent: "#313b46" },
] as const;

type TemplateKey = (typeof templatePresets)[number]["key"];

type ProgramData = {
  name: string;
  organizer: string;
  date: string;
  type: string;
};

type PublishResult = {
  certigenUrl: string;
  cohortId: string;
  webhookSecret: string;
};

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
};

function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span>C</span>
      <SealCheck weight="fill" />
    </div>
  );
}

export function CertigenApp({ userEmail }: { userEmail: string }) {
  const [activeStep, setActiveStep] = useState(0);
  const [program, setProgram] = useState<ProgramData>({
    name: "Design Systems Workshop",
    organizer: "Northstar Learning",
    date: "2026-08-14",
    type: "Workshop",
  });
  const [formUrl, setFormUrl] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "connected" | "error">("idle");
  const [nameField, setNameField] = useState("Full name");
  const [emailField, setEmailField] = useState("Email address");
  const [eligibility, setEligibility] = useState("submission");
  const [templateKey, setTemplateKey] = useState<TemplateKey>("modern");
  const [accent, setAccent] = useState("#1f6f4a");
  const [subject, setSubject] = useState("Your certificate for {{program_name}}");
  const [emailBody, setEmailBody] = useState(
    "Hi {{participant_name}},\n\nThank you for sharing your feedback. Your certificate is ready to download below.\n\nNorthstar Learning",
  );
  const [testEmail, setTestEmail] = useState("");
  const [testSent, setTestSent] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [publishStatus, setPublishStatus] = useState<"idle" | "publishing" | "error">("idle");
  const [publishError, setPublishError] = useState("");

  const progress = ((activeStep + 1) / steps.length) * 100;

  function updateProgram(field: keyof ProgramData, value: string) {
    setProgram((current) => ({ ...current, [field]: value }));
  }

  function goNext(event?: FormEvent) {
    event?.preventDefault();
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function connectForm(event: FormEvent) {
    event.preventDefault();
    const isGoogleForm = /^https:\/\/(docs\.google\.com\/forms|forms\.gle)\//.test(formUrl.trim());
    setFormStatus(isGoogleForm ? "connected" : "error");
  }

  function sendTest(event: FormEvent) {
    event.preventDefault();
    if (!testEmail) return;
    setTestSent(true);
  }

  async function publishWorkflow() {
    if (publishResult) {
      setPublished(true);
      return;
    }

    setPublishStatus("publishing");
    setPublishError("");
    try {
      const response = await fetch("/api/cohorts/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          program,
          formUrl,
          nameField,
          emailField,
          approvalMode: eligibility === "submission" ? "automatic" : "review",
          templateKey,
          accent,
          emailSubject: subject,
          emailBody,
        }),
      });
      const result = (await response.json()) as PublishResult & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not publish the workflow.");
      setPublishResult(result);
      setPublishStatus("idle");
      setPublished(true);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Could not publish the workflow.");
      setPublishStatus("error");
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandMark />
          <span>CertiGen</span>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <button type="button"><House /><span>Overview</span></button>
          <button type="button" className="active"><FileText /><span>Programs</span><span className="nav-count">1</span></button>
          <button type="button"><Users /><span>Recipients</span></button>
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <Sparkle weight="fill" />
          <strong>Starter plan</strong>
          <span>12 of 25 certificates used</span>
          <div className="usage-track"><span /></div>
        </div>
        <nav className="utility-nav" aria-label="Support navigation">
          <button type="button"><Question /><span>Help center</span></button>
          <button type="button"><GearSix /><span>Settings</span></button>
        </nav>
        <button className="account" type="button" title="Sign out" onClick={async () => {
          await fetch("/auth/signout", { method: "POST" });
          window.location.assign("/login");
        }}>
          <span className="avatar">AM</span>
          <span><strong>Workspace owner</strong><small>{userEmail}</small></span>
          <UserCircle />
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><BrandMark /><span>CertiGen</span></div>
          <div className="breadcrumb"><span>Programs</span><b>/</b><strong>New program</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Notifications"><Bell /></button>
            <span className="save-state"><Check /> Draft saved</span>
          </div>
        </header>

        <div className="mobile-progress" aria-label={`Step ${activeStep + 1} of ${steps.length}`}>
          <div><span>Step {activeStep + 1} of {steps.length}</span><strong>{steps[activeStep].label}</strong></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="setup-layout">
          <nav className="step-nav" aria-label="Program setup steps">
            <div className="step-nav-heading">
              <span>New program</span>
              <strong>Set up your workflow</strong>
            </div>
            <ol>
              {steps.map((step, index) => {
                const Icon = step.icon;
                const complete = index < activeStep;
                return (
                  <li key={step.label}>
                    <button
                      type="button"
                      className={index === activeStep ? "current" : complete ? "complete" : ""}
                      onClick={() => setActiveStep(index)}
                    >
                      <span className="step-icon">{complete ? <Check weight="bold" /> : <Icon />}</span>
                      <span><small>Step {index + 1}</small><strong>{step.label}</strong></span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="secure-note">
              <SealCheck weight="fill" />
              <span><strong>Private by default</strong>Feedback never appears on certificates.</span>
            </div>
          </nav>

          <div className="stage">
            {activeStep === 0 ? (
              <form className="panel" onSubmit={goNext}>
                <div className="panel-heading">
                  <span className="kicker">Program details</span>
                  <h1>What are you issuing certificates for?</h1>
                  <p>This information appears in your workflow and can be placed on each certificate.</p>
                </div>
                <div className="form-grid">
                  <Field label="Program name">
                    <input required value={program.name} onChange={(e) => updateProgram("name", e.target.value)} />
                  </Field>
                  <Field label="Program type">
                    <select value={program.type} onChange={(e) => updateProgram("type", e.target.value)}>
                      <option>Workshop</option><option>Course</option><option>Webinar</option><option>Conference</option>
                    </select>
                  </Field>
                  <Field label="Issuing organization">
                    <input required value={program.organizer} onChange={(e) => updateProgram("organizer", e.target.value)} />
                  </Field>
                  <Field label="Completion date">
                    <input type="date" required value={program.date} onChange={(e) => updateProgram("date", e.target.value)} />
                  </Field>
                </div>
                <div className="info-strip"><SealCheck /><span>A unique certificate ID and verification link will be created for every recipient.</span></div>
                <PanelActions onBack={null} nextLabel="Connect Google Form" />
              </form>
            ) : null}

            {activeStep === 1 ? (
              <div className="panel">
                <div className="panel-heading">
                  <span className="kicker">Response source</span>
                  <h1>Connect your Google Form</h1>
                  <p>Paste the public form URL. You will add a secure Apps Script trigger after mapping your fields.</p>
                </div>
                <form className="connect-box" onSubmit={connectForm}>
                  <div className="google-badge"><GoogleLogo weight="bold" /><span>Google Forms</span></div>
                  <Field label="Google Form URL" hint="Example: https://docs.google.com/forms/d/e/…/viewform">
                    <div className="input-action">
                      <input
                        type="url"
                        required
                        placeholder="https://docs.google.com/forms/..."
                        value={formUrl}
                        onChange={(e) => { setFormUrl(e.target.value); setFormStatus("idle"); }}
                        aria-invalid={formStatus === "error"}
                      />
                      <button type="submit">Connect</button>
                    </div>
                  </Field>
                  {formStatus === "connected" ? (
                    <div className="status-message success"><CheckCircle weight="fill" /><span><strong>Form connected</strong>4 questions found and ready to map.</span></div>
                  ) : null}
                  {formStatus === "error" ? (
                    <div className="status-message error"><X weight="bold" /><span><strong>That link does not look right</strong>Use a docs.google.com/forms or forms.gle URL.</span></div>
                  ) : null}
                </form>
                <div className="permission-row">
                  <span className="permission-icon"><SealCheck /></span>
                  <div><strong>You stay in control</strong><p>CertiGen only receives new responses sent by your trigger. It cannot edit your form or access your Google Drive.</p></div>
                </div>
                <PanelActions onBack={() => setActiveStep(0)} onNext={() => setActiveStep(2)} nextLabel="Map response fields" disabled={formStatus !== "connected"} />
              </div>
            ) : null}

            {activeStep === 2 ? (
              <form className="panel" onSubmit={goNext}>
                <div className="panel-heading">
                  <span className="kicker">Field mapping</span>
                  <h1>Tell us which answers to use</h1>
                  <p>Feedback remains private. Only the mapped identity fields are used to issue and deliver certificates.</p>
                </div>
                <div className="mapping-table">
                  <div className="mapping-head"><span>Certificate field</span><span>Google Form question</span></div>
                  <div className="mapping-row">
                    <div><span className="required-dot" /><span><strong>Participant name</strong><small>Printed on certificate</small></span></div>
                    <input required aria-label="Google Form name question" value={nameField} onChange={(e) => setNameField(e.target.value)} placeholder="Exact Google Form question title" />
                  </div>
                  <div className="mapping-row">
                    <div><span className="required-dot" /><span><strong>Email address</strong><small>Certificate delivery</small></span></div>
                    <input required aria-label="Google Form email question" value={emailField} onChange={(e) => setEmailField(e.target.value)} placeholder="Exact Google Form question title" />
                  </div>
                </div>
                <p className="mapping-note">Enter each question exactly as it appears in Google Forms, including capitalization and punctuation.</p>
                <fieldset className="choice-group">
                  <legend>When should a certificate be issued?</legend>
                  <label className={eligibility === "submission" ? "selected" : ""}>
                    <input type="radio" name="eligibility" value="submission" checked={eligibility === "submission"} onChange={(e) => setEligibility(e.target.value)} />
                    <span><strong>After every valid submission</strong><small>Best for open workshops and informal events.</small></span><CheckCircle weight="fill" />
                  </label>
                  <label className={eligibility === "attendee" ? "selected" : ""}>
                    <input type="radio" name="eligibility" value="attendee" checked={eligibility === "attendee"} onChange={(e) => setEligibility(e.target.value)} />
                    <span><strong>Only if email is on the attendee list</strong><small>Recommended for completion and accredited programs.</small></span><SealCheck weight="fill" />
                  </label>
                </fieldset>
                <PanelActions onBack={() => setActiveStep(1)} nextLabel="Design certificate" />
              </form>
            ) : null}

            {activeStep === 3 ? (
              <div className="panel panel-wide">
                <div className="panel-heading compact">
                  <span className="kicker">Certificate design</span>
                  <h1>Make the credential yours</h1>
                  <p>Choose a polished layout, then set the accent color. Every option exports reliably to landscape A4.</p>
                </div>
                <div className="designer">
                  <div className="designer-controls">
                    <div className="template-picker">
                      <span className="control-label">Choose a layout</span>
                      {templatePresets.map((template) => (
                        <button
                          type="button"
                          className={templateKey === template.key ? "selected" : ""}
                          key={template.key}
                          aria-pressed={templateKey === template.key}
                          onClick={() => {
                            setTemplateKey(template.key);
                            setAccent(template.accent);
                          }}
                        >
                          <span className={`template-thumbnail template-${template.key}`}><i /></span>
                          <span><strong>{template.name}</strong><small>{template.description}</small></span>
                          {templateKey === template.key ? <CheckCircle weight="fill" /> : null}
                        </button>
                      ))}
                    </div>
                    <Field label="Certificate accent">
                      <div className="color-field"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} /><span>{accent.toUpperCase()}</span></div>
                    </Field>
                    <div className="variable-list">
                      <span>Included variables</span>
                      <code>{"{{participant_name}}"}</code>
                      <code>{"{{program_name}}"}</code>
                      <code>{"{{completion_date}}"}</code>
                      <code>{"{{certificate_id}}"}</code>
                    </div>
                  </div>
                  <CertificatePreview program={program} accent={accent} templateKey={templateKey} />
                </div>
                <PanelActions onBack={() => setActiveStep(2)} onNext={() => setActiveStep(4)} nextLabel="Configure email" />
              </div>
            ) : null}

            {activeStep === 4 ? (
              <div className="panel panel-wide">
                <div className="panel-heading compact">
                  <span className="kicker">Email & launch</span>
                  <h1>Deliver it with confidence</h1>
                  <p>Personalize the message, send yourself a test, and activate the workflow.</p>
                </div>
                <div className="launch-grid">
                  <div className="email-editor">
                    <Field label="Email subject">
                      <input value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </Field>
                    <Field label="Email message" hint="Variables are replaced when each email is sent.">
                      <textarea rows={7} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
                    </Field>
                    <div className="token-row"><button type="button">+ Participant name</button><button type="button">+ Program name</button></div>
                  </div>
                  <div className="email-preview">
                    <div className="preview-top"><EnvelopeSimple /><span>Email preview</span></div>
                    <div className="email-meta"><span>From</span><strong>{program.organizer} via CertiGen</strong><span>Subject</span><strong>{subject.replace("{{program_name}}", program.name)}</strong></div>
                    <div className="email-copy">{emailBody.replace("{{participant_name}}", "Jordan Lee").split("\n").map((line, index) => <p key={`${line}-${index}`}>{line || <br />}</p>)}</div>
                    <div className="download-block"><FileText /><span><strong>{program.name}</strong><small>Verified PDF certificate</small></span><button type="button">Download</button></div>
                  </div>
                </div>

                <form className="test-row" onSubmit={sendTest}>
                  <div><strong>Send a test certificate</strong><span>Check the message and certificate before launch.</span></div>
                  <div className="test-action"><input type="email" required placeholder="you@example.com" value={testEmail} onChange={(e) => { setTestEmail(e.target.value); setTestSent(false); }} /><button type="submit">Send test</button></div>
                  {testSent ? <span className="test-success"><CheckCircle weight="fill" /> Test queued</span> : null}
                </form>

                <div className="launch-summary">
                  <div><CheckCircle weight="fill" /><span><strong>Google Form connected</strong><small>4 response fields detected</small></span></div>
                  <div><CheckCircle weight="fill" /><span><strong>Certificate ready</strong><small>Verification enabled</small></span></div>
                  <div><CheckCircle weight="fill" /><span><strong>Email configured</strong><small>Delivered through CertiGen</small></span></div>
                </div>
                <div className="panel-actions launch-actions">
                  <button className="button secondary" type="button" onClick={() => setActiveStep(3)}><ArrowLeft /> Back</button>
                  <button className="button primary" type="button" onClick={publishWorkflow} disabled={publishStatus === "publishing"}><PaperPlaneTilt weight="fill" /> {publishStatus === "publishing" ? "Publishing..." : publishResult ? "View connection" : "Publish workflow"}</button>
                </div>
                {publishStatus === "error" ? <div className="publish-error"><X weight="bold" /> {publishError}</div> : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {published && publishResult ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPublished(false)}>
          <section className="success-modal" role="dialog" aria-modal="true" aria-labelledby="success-title" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setPublished(false)}><X /></button>
            <span className="success-seal"><SealCheck weight="fill" /></span>
            <span className="kicker">Workflow ready</span>
            <h2 id="success-title">Your program is live.</h2>
            <p>Use these values in the Apps Script setup. The webhook secret is shown only in this browser session.</p>
            <div className="connection-values">
              <ConnectionValue label="CERTIGEN_URL" value={publishResult.certigenUrl} />
              <ConnectionValue label="COHORT_ID" value={publishResult.cohortId} />
              <ConnectionValue label="WEBHOOK_SECRET" value={publishResult.webhookSecret} secret />
            </div>
            <button className="button secondary copy-connection" type="button" onClick={() => navigator.clipboard?.writeText(`CERTIGEN_URL=${publishResult.certigenUrl}\nCOHORT_ID=${publishResult.cohortId}\nWEBHOOK_SECRET=${publishResult.webhookSecret}`)}><ClipboardText /> Copy all values</button>
            <a className="button primary" href="/google-forms-setup.md" download>Open setup guide <ArrowRight /></a>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function ConnectionValue({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  return (
    <div className="connection-value">
      <span>{label}</span>
      <code>{secret ? `${value.slice(0, 10)}...${value.slice(-6)}` : value}</code>
      <button type="button" onClick={() => navigator.clipboard?.writeText(value)}>Copy</button>
    </div>
  );
}

function PanelActions({ onBack, onNext, nextLabel, disabled = false }: { onBack: (() => void) | null; onNext?: () => void; nextLabel: string; disabled?: boolean }) {
  return (
    <div className="panel-actions">
      {onBack ? <button className="button secondary" type="button" onClick={onBack}><ArrowLeft /> Back</button> : <span />}
      <button className="button primary" type={onNext ? "button" : "submit"} onClick={onNext} disabled={disabled}>{nextLabel} <ArrowRight /></button>
    </div>
  );
}

function CertificatePreview({ program, accent, templateKey }: { program: ProgramData; accent: string; templateKey: TemplateKey }) {
  const formattedDate = program.date
    ? new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${program.date}T00:00:00Z`))
    : "Completion date";

  return (
    <div className="certificate-workspace">
      <div className="canvas-label"><span>Live preview</span><span>Landscape · A4</span></div>
      <div className="certificate" data-template={templateKey} style={{ "--certificate-accent": accent } as React.CSSProperties}>
        <div className="certificate-rule" />
        <div className="certificate-brand"><BrandMark /><span>{program.organizer}</span></div>
        <span className="certificate-label">Certificate of completion</span>
        <p>This certificate is proudly presented to</p>
        <h2>Jordan Lee</h2>
        <p>for successfully completing</p>
        <h3>{program.name || "Program name"}</h3>
        <div className="certificate-footer">
          <span><strong>{formattedDate}</strong><small>Date issued</small></span>
          <span className="certificate-seal"><SealCheck weight="fill" /></span>
          <span><strong>CG-26-0042</strong><small>Certificate ID</small></span>
        </div>
      </div>
      <span className="preview-caption"><SealCheck weight="fill" /> Verification QR and unique ID included automatically</span>
    </div>
  );
}
