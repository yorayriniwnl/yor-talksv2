import { eq, desc, sql } from "drizzle-orm";
import { eventsTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { EventRecord } from "../types/index.js";

export class EventRepository {
  async create(event: EventRecord): Promise<EventRecord> {
    const [created] = await db.insert(eventsTable).values(event).returning();
    return created as EventRecord;
  }

  async list(): Promise<EventRecord[]> {
    return (await db.select().from(eventsTable).orderBy(eventsTable.startsAt).limit(100)) as EventRecord[];
  }

  async findById(id: string): Promise<EventRecord | undefined> {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
    return event as EventRecord | undefined;
  }

  async update(id: string, updates: Partial<EventRecord>): Promise<EventRecord | undefined> {
    const [updated] = await db.update(eventsTable).set(updates).where(eq(eventsTable.id, id)).returning();
    return updated as EventRecord | undefined;
  }

  async setRsvp(id: string, userId: string, status: "going" | "interested" | null): Promise<EventRecord | undefined> {
    const withoutUser = (column: typeof eventsTable.attendeeIds | typeof eventsTable.interestedIds) => sql`
      COALESCE((
        SELECT jsonb_agg(to_jsonb(value))
        FROM jsonb_array_elements_text(COALESCE(${column}, '[]'::jsonb)) AS values(value)
        WHERE value <> ${userId}
      ), '[]'::jsonb)
    `;
    const attendees = withoutUser(eventsTable.attendeeIds);
    const interested = withoutUser(eventsTable.interestedIds);
    const [updated] = await db.update(eventsTable).set({
      attendeeIds: status === "going" ? sql`${attendees} || jsonb_build_array(${userId})` : attendees,
      interestedIds: status === "interested" ? sql`${interested} || jsonb_build_array(${userId})` : interested,
    }).where(eq(eventsTable.id, id)).returning();
    return updated as EventRecord | undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(eventsTable).where(eq(eventsTable.id, id)).returning();
    return result.length > 0;
  }
}
