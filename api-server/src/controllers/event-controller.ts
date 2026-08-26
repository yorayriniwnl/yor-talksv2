import { type Request, type Response } from "express";
import { EventService } from "../services/event-service.js";
import { createResponse } from "../utils/response.js";

function paramId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class EventController {
  constructor(private readonly eventService: EventService) {}

  private view(event: any, viewerId?: string) {
    const attendees = Array.isArray(event.attendeeIds) ? event.attendeeIds : [];
    const interested = Array.isArray(event.interestedIds) ? event.interestedIds : [];
    const { attendeeIds, interestedIds, ...publicEvent } = event;
    return {
      ...publicEvent,
      attendeeCount: attendees.length,
      interestedCount: interested.length,
      attendeeIds: viewerId && attendees.includes(viewerId) ? [viewerId] : [],
      interestedIds: viewerId && interested.includes(viewerId) ? [viewerId] : [],
    };
  }

  create = async (req: Request, res: Response) => {
    const hostId = req.user?.id;
    if (!hostId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const event = await this.eventService.createEvent({ ...req.body, hostId });
    return res.status(201).json(createResponse("Event created", this.view(event, hostId)));
  };

  list = async (req: Request, res: Response) => {
    const events = await this.eventService.listEvents();
    return res.status(200).json(createResponse("Events retrieved", events.map((event) => this.view(event, req.user?.id))));
  };

  get = async (req: Request, res: Response) => {
    const event = await this.eventService.getEvent(paramId(req));
    if (!event) {
      return res.status(404).json(createResponse("Event not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Event retrieved", this.view(event, req.user?.id)));
  };

  remove = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const deleted = await this.eventService.deleteEvent(paramId(req), userId);
    if (!deleted) {
      return res.status(404).json(createResponse("Event not found or not yours to delete", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Event deleted", null));
  };

  rsvp = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const event = await this.eventService.setRsvp(paramId(req), userId, req.body.status);
    if (!event) {
      return res.status(404).json(createResponse("Event not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("RSVP updated", this.view(event, userId)));
  };
}
