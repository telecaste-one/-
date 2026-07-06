import nodemailer from "nodemailer";

export type MailContent = { to: string; subject: string; lines: string[] };

export type MailResult = { sent: boolean; error?: string };

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

// Sends one email and reports whether it actually went out. A booking must
// never fail just because SMTP isn't configured yet — the caller always has
// the composed subject/lines to show as an in-app preview regardless.
export async function sendMail(content: MailContent): Promise<MailResult> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[mail] SMTP_HOST not set — skipping real send to ${content.to}: ${content.subject}`);
    return { sent: false, error: "SMTP is not configured (SMTP_HOST missing)." };
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || "CORE.PT <no-reply@core-pt.studio>",
      to: content.to,
      subject: content.subject,
      text: content.lines.join("\n"),
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[mail] send failed to ${content.to}:`, message);
    return { sent: false, error: message };
  }
}
