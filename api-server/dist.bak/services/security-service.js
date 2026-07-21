import crypto from "node:crypto";
export class SecurityService {
    auditLog = [];
    createAuditEvent(type, message) {
        const event = {
            id: crypto.randomUUID(),
            type,
            message,
            createdAt: new Date().toISOString(),
        };
        this.auditLog.push(event);
        return event;
    }
    getAuditLog() {
        return [...this.auditLog];
    }
    detectAbuse(userId, action) {
        const recent = this.auditLog.filter((entry) => entry.type === action && entry.message.includes(userId)).length;
        return recent >= 5;
    }
}
//# sourceMappingURL=security-service.js.map