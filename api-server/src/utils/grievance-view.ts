import type { GrievanceTicket } from '../services/moderation-service.js';

/** Possession of a tracking ticket grants only this public receipt/status view. */
export function publicGrievanceView(ticket: GrievanceTicket) {
  return {
    ticketId: ticket.ticketId,
    status: ticket.status,
    createdAt: ticket.createdAt,
    reviewTargetAt: ticket.slaDeadline,
  };
}
