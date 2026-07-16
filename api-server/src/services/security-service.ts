import crypto from "node:crypto";

export interface AuditEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export class SecurityService {
  private readonly auditLog: AuditEvent[] = [];

  createAuditEvent(type: string, message: string): AuditEvent {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      type,
      message,
      createdAt: new Date().toISOString(),
    };
    this.auditLog.push(event);
    return event;
  }

  getAuditLog(): AuditEvent[] {
    return [...this.auditLog];
  }

  detectAbuse(userId: string, action: string): boolean {
    const recent = this.auditLog.filter((entry) => entry.type === action && entry.message.includes(userId)).length;
    return recent >= 5;
  }
}
