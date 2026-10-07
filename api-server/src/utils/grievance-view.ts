import type { GrievanceTicket } from "../services/moderation-service.js";

export type PublicGrievanceReceipt = Pick<GrievanceTicket, "ticketId" | "status" | "createdAt"> &
  Partial<Pick<GrievanceTicket, "slaDeadline">>;

/** Public ticket possession permits status tracking, never access to case evidence. */
export function toPublicGrievance(ticket: GrievanceTicket): PublicGrievanceReceipt {
  return {
    ticketId: ticket.ticketId,
    status: ticket.status,
    createdAt: ticket.createdAt,
    ...(ticket.slaDeadline ? { slaDeadline: ticket.slaDeadline } : {}),
  };
}
