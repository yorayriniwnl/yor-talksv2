import crypto from "node:crypto";
import { logger } from "../lib/logger.js";

export interface AuditEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  subject?: string;
}

export class SecurityService {
  private readonly auditLog: AuditEvent[] = [];

  createAuditEvent(type: string, message: string, subject?: string): AuditEvent {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      type,
      message,
      createdAt: new Date().toISOString(),
      ...(subject ? { subject } : {}),
    };
    this.auditLog.push(event);
    if (this.auditLog.length > 5000) this.auditLog.splice(0, this.auditLog.length - 5000);
    logger.warn({ eventId: event.id, type, message }, "Security audit event");
    return event;
  }

  getAuditLog(): AuditEvent[] {
    return [...this.auditLog];
  }

  detectAbuse(userId: string, action: string): boolean {
    const cutoff = Date.now() - 15 * 60 * 1000;
    const recent = this.auditLog.filter((entry) => {
      if (entry.type !== action || Date.parse(entry.createdAt) < cutoff) return false;
      if (entry.subject) return entry.subject === userId;
      return entry.message === userId || entry.message.startsWith(`${userId} `) || entry.message.startsWith(`${userId} —`);
    });
    return recent.length >= 5;
  }
}
