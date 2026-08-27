import type { Request, Response } from "express";
import { ContentPolicyViolationError } from "../services/content-policy-service.js";
import { BroadcastChannelService } from "../services/broadcast-channel-service.js";
import { createResponse } from "../utils/response.js";

function paramId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class BroadcastChannelController {
  constructor(private readonly service: BroadcastChannelService) {}

  list = async (req: Request, res: Response) => {
    const viewerId = req.user?.id;
    if (!viewerId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    return res.status(200).json(createResponse("Broadcast channels retrieved", await this.service.listChannels(viewerId)));
  };

  create = async (req: Request, res: Response) => {
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    try {
      const channel = await this.service.createChannel({ ...req.body, ownerId });
      return res.status(201).json(createResponse("Broadcast channel created", channel));
    } catch (error) {
      if (error instanceof ContentPolicyViolationError) {
        return res.status(422).json(createResponse(error.message, null, {}, Object.entries(error.flags).filter(([, value]) => value).map(([key]) => key)));
      }
      throw error;
    }
  };

  join = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    const channel = await this.service.joinChannel(paramId(req), userId);
    if (!channel) return res.status(404).json(createResponse("Broadcast channel not found", null, {}, ["Not found"]));
    return res.status(200).json(createResponse("Subscribed to broadcast channel", channel));
  };

  leave = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    const channel = await this.service.leaveChannel(paramId(req), userId);
    if (!channel) return res.status(400).json(createResponse("Channel owners cannot leave their own channel", null, {}, ["owner_cannot_leave"]));
    return res.status(200).json(createResponse("Unsubscribed from broadcast channel", channel));
  };

  notifications = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    const channel = await this.service.setNotifications(paramId(req), userId, req.body.enabled);
    if (!channel) return res.status(404).json(createResponse("Broadcast channel subscription not found", null, {}, ["Subscription not found"]));
    return res.status(200).json(createResponse(channel.notificationsEnabled ? "Channel notifications enabled" : "Channel notifications muted", channel));
  };

  messages = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    const messages = await this.service.listMessages(paramId(req), userId);
    if (!messages) return res.status(403).json(createResponse("Subscribe to this channel to view its messages", null, {}, ["channel_subscription_required"]));
    return res.status(200).json(createResponse("Broadcast channel messages retrieved", messages));
  };

  createMessage = async (req: Request, res: Response) => {
    const authorId = req.user?.id;
    if (!authorId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    try {
      const message = await this.service.createMessage({ ...req.body, channelId: paramId(req), authorId });
      if (!message) return res.status(403).json(createResponse("Only the channel owner can publish channel messages", null, {}, ["channel_owner_required"]));
      return res.status(201).json(createResponse("Broadcast message published", message));
    } catch (error) {
      if (error instanceof ContentPolicyViolationError) {
        return res.status(422).json(createResponse(error.message, null, {}, Object.entries(error.flags).filter(([, value]) => value).map(([key]) => key)));
      }
      throw error;
    }
  };
}
