import type { GrievanceTicket } from "../services/moderation-service.js";

export type PublicGrievance = Pick<
  GrievanceTicket,
  "ticketId" | "status" | "createdAt"
>;

/** Public ticket possession permits status tracking, never access to case evidence. */
export function toPublicGrievance(ticket: GrievanceTicket): PublicGrievance {
  return {
    ticketId: ticket.ticketId,
    status: ticket.status,
    createdAt: ticket.createdAt,
  };
}
