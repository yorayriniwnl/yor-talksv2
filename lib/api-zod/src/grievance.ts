import { z } from "zod";

export const grievancePublicStatusSchema = z.enum(["received", "under_review", "resolved", "dismissed"]);

/** Public ticket possession grants status access only, never reporter or staff details. */
export const publicGrievanceTicketSchema = z.object({
  ticketId: z.string().regex(/^YT-GRV-[A-Z0-9]{10}$/),
  status: grievancePublicStatusSchema,
  createdAt: z.string().datetime(),
  slaDeadline: z.string().datetime().optional(),
});

export type PublicGrievanceTicket = z.infer<typeof publicGrievanceTicketSchema>;

export function publicGrievanceTicket(ticket: { ticketId: string; status: string; createdAt: string; slaDeadline?: string | null }): PublicGrievanceTicket {
  // PostgreSQL's legacy timestamp-without-time-zone rows store server UTC wall
  // time. Do not reinterpret those strings in the application host timezone.
  const createdAt = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(ticket.createdAt)
    ? ticket.createdAt : `${ticket.createdAt.replace(' ', 'T')}Z`;
  const slaDeadline = ticket.slaDeadline
    ? (/(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(ticket.slaDeadline)
      ? ticket.slaDeadline : `${ticket.slaDeadline.replace(' ', 'T')}Z`)
    : undefined;
  // Explicit projection must remain safe when the database gains new fields.
  return publicGrievanceTicketSchema.parse({
    ticketId: ticket.ticketId,
    status: ticket.status,
    createdAt: new Date(createdAt).toISOString(),
    ...(slaDeadline ? { slaDeadline: new Date(slaDeadline).toISOString() } : {}),
  });
}
