import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  async sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html } = options;

    // Log for local dev / unconfigured SMTP
    logger.info({ to, subject }, "Email dispatch requested");

    if (env.NODE_ENV !== "production") {
      console.log("==========================================");
      console.log(`[EMAIL DISPATCH] To: ${to}`);
      console.log(`[SUBJECT]: ${subject}`);
      console.log(`[BODY]:\n${html}`);
      console.log("==========================================");
    }

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
    const verifyUrl = `${env.CLIENT_ORIGIN ?? "http://localhost:5173"}/verify-email?token=${verifyToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #0a0906; color: #f0e8d8;">
        <h2 style="color: #c9a84c;">Yor Talks - Verify Email</h2>
        <p>Thank you for joining Yor Talks! Please verify your email address below:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #c9a84c; color: #0a0906; text-decoration: none; font-weight: bold; border-radius: 6px;">Verify Email</a>
      </div>
    `;
    return this.sendEmail({ to: email, subject: "Yor Talks - Verify Your Email", html });
  }
}
