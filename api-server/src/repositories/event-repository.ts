import { and, eq, inArray } from "drizzle-orm";
import { eventRsvpsTable, eventsTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { EventRecord } from "../types/index.js";

export class EventRepository {
  async create(event: EventRecord): Promise<EventRecord> {
    const { attendeeIds: _attendeeIds, interestedIds: _interestedIds, rsvpStatus: _rsvpStatus, ...persistedEvent } = event;
    const [created] = await db.insert(eventsTable).values(persistedEvent).returning();
    return { ...(created as EventRecord), attendeeIds: [], interestedIds: [] };
  }

  async list(): Promise<EventRecord[]> {
    return this.hydrateRsvps((await db.select().from(eventsTable).orderBy(eventsTable.startsAt).limit(100)) as EventRecord[]);
  }

  async findById(id: string): Promise<EventRecord | undefined> {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
    return event ? (await this.hydrateRsvps([event as EventRecord]))[0] : undefined;
  }

  async update(id: string, updates: Partial<EventRecord>): Promise<EventRecord | undefined> {
    const { attendeeIds: _attendeeIds, interestedIds: _interestedIds, ...persistedUpdates } = updates;
    const [updated] = await db.update(eventsTable).set(persistedUpdates).where(eq(eventsTable.id, id)).returning();
    return updated ? (await this.hydrateRsvps([updated as EventRecord]))[0] : undefined;
  }

  async setRsvp(id: string, userId: string, status: "going" | "interested" | null): Promise<EventRecord | undefined> {
    if (status) {
      await db.insert(eventRsvpsTable).values({ eventId: id, userId, status })
        .onConflictDoUpdate({
          target: [eventRsvpsTable.eventId, eventRsvpsTable.userId],
          set: { status, updatedAt: new Date().toISOString() },
        });
    } else {
      await db.delete(eventRsvpsTable).where(and(
        eq(eventRsvpsTable.eventId, id),
        eq(eventRsvpsTable.userId, userId),
      ));
    }
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(eventsTable).where(eq(eventsTable.id, id)).returning();
    return result.length > 0;
  }

  private async hydrateRsvps(events: EventRecord[]): Promise<EventRecord[]> {
    if (events.length === 0) return [];
    const rsvps = await db.select({
      eventId: eventRsvpsTable.eventId,
      userId: eventRsvpsTable.userId,
      status: eventRsvpsTable.status,
    }).from(eventRsvpsTable).where(inArray(eventRsvpsTable.eventId, events.map((event) => event.id)));
    const attendees = new Map<string, string[]>();
    const interested = new Map<string, string[]>();
    for (const rsvp of rsvps) {
      const target = rsvp.status === "going" ? attendees : interested;
      const current = target.get(rsvp.eventId) ?? [];
      current.push(rsvp.userId);
      target.set(rsvp.eventId, current);
    }
    return events.map((event) => ({
      ...event,
      attendeeIds: attendees.get(event.id) ?? [],
      interestedIds: interested.get(event.id) ?? [],
    }));
  }
}
