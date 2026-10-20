import type { GrievanceTicket } from "../services/moderation-service.js";

export type PublicGrievance = Pick<
  GrievanceTicket,
  "ticketId" | "status" | "slaDeadline" | "createdAt"
>;

export function toPublicGrievance(ticket: GrievanceTicket): PublicGrievance {
  return {
    ticketId: ticket.ticketId,
    status: ticket.status,
    slaDeadline: ticket.slaDeadline,
    createdAt: ticket.createdAt,
  };
}
