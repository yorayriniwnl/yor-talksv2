import { randomUUID } from "node:crypto";
import { EventRepository } from "../repositories/event-repository.js";
import type { EventRecord } from "../types/index.js";

export class EventService {
  constructor(private readonly eventRepository: EventRepository) {}

  async createEvent(input: {
    hostId: string;
    title: string;
    description: string;
    coverUrl: string;
    category: string;
    startsAt: string;
    location: string;
    isOnline: boolean;
  }): Promise<EventRecord> {
    const event: EventRecord = {
      id: randomUUID(),
      hostId: input.hostId,
      title: input.title,
      description: input.description,
      coverUrl: input.coverUrl,
      category: input.category,
      startsAt: input.startsAt,
      location: input.location,
      isOnline: input.isOnline,
      attendeeIds: [],
      interestedIds: [],
    };
    return this.eventRepository.create(event);
  }

  async listEvents(): Promise<EventRecord[]> {
    return this.eventRepository.list();
  }

  async getEvent(id: string): Promise<EventRecord | undefined> {
    return this.eventRepository.findById(id);
  }

  async deleteEvent(id: string, userId: string): Promise<boolean> {
    const event = await this.eventRepository.findById(id);
    if (!event || event.hostId !== userId) {
      return false;
    }
    return this.eventRepository.delete(id);
  }

  /** status: 'going' | 'interested' | null (null clears any existing RSVP) */
  async setRsvp(eventId: string, userId: string, status: "going" | "interested" | null): Promise<EventRecord | undefined> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) return undefined;

    const attendeeIds = event.attendeeIds.filter((id) => id !== userId);
    const interestedIds = event.interestedIds.filter((id) => id !== userId);
    if (status === "going") attendeeIds.push(userId);
    if (status === "interested") interestedIds.push(userId);

    return this.eventRepository.update(eventId, { attendeeIds, interestedIds });
  }
}
