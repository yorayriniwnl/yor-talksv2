import { createHash } from "node:crypto";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";
import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";

function recipientHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}

export class EmailDeliveryNotConfiguredError extends Error {
  constructor() {
    super("Email delivery is not configured for this deployment");
    this.name = "EmailDeliveryNotConfiguredError";
  }
}

export class EmailDeliveryProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryProviderError";
  }
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private renderTemplate(input: {
    eyebrow: string;
    title: string;
    body: string;
    actionLabel?: string;
    actionUrl?: string;
    code?: string;
    footnote: string;
  }): string {
    const action = input.actionLabel && input.actionUrl
      ? `<a href="${input.actionUrl}" style="display:inline-block;margin-top:24px;padding:13px 20px;border-radius:8px;background:#f43f5e;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${input.actionLabel} &nbsp;→</a>`
      : "";
    const code = input.code
      ? `<div style="margin-top:24px;padding:22px;border:1px solid #343946;border-radius:10px;background:#090b0e;text-align:center;"><div style="margin-bottom:8px;color:#727986;font-family:monospace;font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;">One-time access code</div><div style="color:#fb7185;font-family:monospace;font-size:34px;font-weight:800;letter-spacing:9px;">${input.code}</div></div>`
      : "";

    return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#07080b;color:#f3f4f6;font-family:Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">${input.title}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#07080b;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 0 18px;color:#f3f4f6;font-size:14px;font-weight:800;">
                <span style="display:inline-block;margin-right:9px;padding:6px 9px;border-radius:7px;background:#f43f5e;color:#ffffff;">Y</span>
                Yor Talks <span style="color:#727986;font-family:monospace;font-size:9px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">// secure access</span>
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #2a2e38;border-top:2px solid #f43f5e;border-radius:12px;background:#0d0f13;padding:34px;">
                <div style="color:#fb7185;font-family:monospace;font-size:10px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase;">${input.eyebrow}</div>
                <h1 style="margin:14px 0 0;color:#f3f4f6;font-family:Georgia,serif;font-size:36px;font-weight:500;letter-spacing:-1.5px;line-height:1;">${input.title}</h1>
                <p style="margin:18px 0 0;color:#a5aab5;font-size:14px;line-height:1.7;">${input.body}</p>
                ${code}
                ${action}
                <div style="margin-top:30px;padding-top:18px;border-top:1px solid #252932;color:#727986;font-size:11px;line-height:1.65;">${input.footnote}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 4px;color:#565d69;font-family:monospace;font-size:9px;letter-spacing:0.7px;text-transform:uppercase;">Identity · Signal · Proof &nbsp; / &nbsp; Yor Talks</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html } = options;

    if ((env.NODE_ENV as string) !== "production" && !env.RESEND_API_KEY) {
      // Development and tests stay usable without an external email account.
      // Do not print the address, subject, HTML, or text: verification links,
      // reset links, and email OTPs are credentials and must not land in logs.
      logger.info({ recipientHash: recipientHash(to), htmlBytes: Buffer.byteLength(html, "utf8") }, "Email dispatch simulated");
      return true;
    }

    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      throw new EmailDeliveryNotConfiguredError();
    }

    const response = await fetchWithTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [to],
        subject,
        html,
        ...(options.text ? { text: options.text } : {}),
      }),
    }, 12_000);

    if (!response.ok) {
      await response.text().catch(() => undefined);
      logger.error({ status: response.status, recipientHash: recipientHash(to) }, "Resend email delivery failed");
      throw new EmailDeliveryProviderError(`Resend rejected the email (${response.status})`);
    }

    // Subjects can contain one-time login codes, so keep provider logs opaque.
    logger.info({ recipientHash: recipientHash(to) }, "Email delivered through Resend");
    return true;
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${env.CLIENT_ORIGIN ?? "http://localhost:5173"}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const html = this.renderTemplate({
      eyebrow: "AUTH / RECOVERY",
      title: "Reset your password.",
      body: "A password reset was requested for your Yor Talks account. Use the secure link below to choose a new credential.",
      actionLabel: "Set a new password",
      actionUrl: resetUrl,
      footnote: "This link expires in 1 hour and can be used once. If you did not request it, you can safely ignore this message; your password will not change.",
    });
    return this.sendEmail({
      to: email,
      subject: "Reset your Yor Talks password",
      html,
      text: `Reset your Yor Talks password: ${resetUrl}. This single-use link expires in 1 hour.`,
    });
  }

  async sendVerificationEmail(email: string, verifyToken: string): Promise<boolean> {
    const verifyUrl = `${env.CLIENT_ORIGIN ?? "http://localhost:5173"}/verify-email/${encodeURIComponent(verifyToken)}`;
    const html = this.renderTemplate({
      eyebrow: "AUTH / VERIFY",
      title: "Confirm your identity.",
      body: "Your Yor Talks profile is ready. Verify that this email belongs to you, then sign in and configure your first signal.",
      actionLabel: "Verify email",
      actionUrl: verifyUrl,
      footnote: "This verification link expires in 24 hours. If you did not create a Yor Talks account, no action is needed.",
    });
    return this.sendEmail({
      to: email,
      subject: "Verify your Yor Talks email",
      html,
      text: `Verify your Yor Talks email: ${verifyUrl}. This link expires in 24 hours.`,
    });
  }

  async sendEmailLoginCode(email: string, code: string): Promise<boolean> {
    const html = this.renderTemplate({
      eyebrow: "AUTH / EMAIL CODE",
      title: "Your sign-in code.",
      body: "Enter this six-digit code on the Yor Talks sign-in screen. You do not need to click a link.",
      code,
      footnote: "This code expires in 5 minutes and can be used once. Never share it with anyone. If you did not request it, ignore this message.",
    });
    return this.sendEmail({
      to: email,
      subject: `${code} is your Yor Talks sign-in code`,
      html,
      text: `Your Yor Talks sign-in code is ${code}. It expires in 5 minutes.`,
    });
  }
}
