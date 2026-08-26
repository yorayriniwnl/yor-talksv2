import { randomUUID } from "node:crypto";
import { EventRepository } from "../repositories/event-repository.js";
import type { EventRecord } from "../types/index.js";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";

export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
    private readonly aiService: AIService = new AIService(),
  ) {}

  async createEvent(input: {
    hostId: string;
    title: string;
    description: string;
    coverUrl: string;
    category: string;
    startsAt: string;
    location: string;
    isOnline: boolean;
    contentRating?: EventRecord["contentRating"];
  }): Promise<EventRecord> {
    await enforceTextContentPolicy(`${input.title}\n${input.description}`, this.aiService, "event");
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
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
    };
    return this.eventRepository.create(event);
  }

  async listEvents(viewerId?: string): Promise<EventRecord[]> {
    return this.contentSafetyService.filterVisible(await this.eventRepository.list(), viewerId);
  }

  async getEvent(id: string, viewerId?: string): Promise<EventRecord | undefined> {
    const event = await this.eventRepository.findById(id);
    return await this.contentSafetyService.isVisible(event, viewerId) ? event : undefined;
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

    return this.eventRepository.setRsvp(eventId, userId, status);
  }
}
