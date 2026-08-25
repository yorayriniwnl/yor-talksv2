import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";

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
  async sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html } = options;

    if ((env.NODE_ENV as string) !== "production" && !env.RESEND_API_KEY) {
      // Development and tests stay usable without an external email account.
      logger.info({ to, subject }, "Email dispatch requested");
      console.log("==========================================");
      console.log(`[EMAIL DISPATCH] To: ${to}`);
      console.log(`[SUBJECT]: ${subject}`);
      console.log(`[BODY]:\n${html}`);
      console.log("==========================================");
      return true;
    }

    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      throw new EmailDeliveryNotConfiguredError();
    }

    const response = await fetch("https://api.resend.com/emails", {
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
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "Unknown Resend error");
      logger.error({ status: response.status, detail }, "Resend email delivery failed");
      throw new EmailDeliveryProviderError(`Resend rejected the email (${response.status})`);
    }

    logger.info({ to, subject }, "Email delivered through Resend");
    return true;
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${env.CLIENT_ORIGIN ?? "http://localhost:5173"}/reset-password?token=${resetToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #0a0906; color: #f0e8d8;">
        <h2 style="color: #c9a84c;">Yor Talks - Password Reset</h2>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #c9a84c; color: #0a0906; text-decoration: none; font-weight: bold; border-radius: 6px;">Reset Password</a>
        <p style="margin-top: 20px; font-size: 0.85em; color: #a89878;">If you did not request this, please ignore this email. Token expires in 1 hour.</p>
      </div>
    `;
    return this.sendEmail({ to: email, subject: "Yor Talks - Reset Your Password", html });
  }

  async sendVerificationEmail(email: string, verifyToken: string): Promise<boolean> {
    const verifyUrl = `${env.CLIENT_ORIGIN ?? "http://localhost:5173"}/verify-email/${encodeURIComponent(verifyToken)}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #0a0906; color: #f0e8d8;">
        <h2 style="color: #c9a84c;">Yor Talks - Verify Email</h2>
        <p>Thank you for joining Yor Talks! Please verify your email address below:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #c9a84c; color: #0a0906; text-decoration: none; font-weight: bold; border-radius: 6px;">Verify Email</a>
      </div>
    `;
    return this.sendEmail({ to: email, subject: "Yor Talks - Verify Your Email", html });
  }

  async sendEmailLoginCode(email: string, code: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #0a0906; color: #f0e8d8;">
        <h2 style="color: #c9a84c;">Yor Talks - Sign-in code</h2>
        <p>Use this one-time code to sign in to your Yor Talks account:</p>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #c9a84c;">${code}</p>
        <p style="font-size: 0.85em; color: #a89878;">This code expires in 5 minutes and can be used once. If you did not request it, ignore this email.</p>
      </div>
    `;
    return this.sendEmail({
      to: email,
      subject: "Yor Talks - Your sign-in code",
      html,
      text: `Your Yor Talks sign-in code is ${code}. It expires in 5 minutes.`,
    });
  }
}
