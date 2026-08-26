import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { ai, AIProviderNotConfiguredError } from "../services/ai/AIGateway.js";
import { db } from "@workspace/db";
import { userTopicsTable, topicsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { createResponse } from "../utils/response.js";
import { PostRepository } from "../repositories/post-repository.js";
import { ContactShieldService } from "../services/contact-shield-service.js";
import { ContentSafetyService } from "../services/content-safety-service.js";

const router = Router();
const postRepository = new PostRepository();
const contactShieldService = new ContactShieldService();
const contentSafetyService = new ContentSafetyService();

// Copilot Ideation Chat
router.post("/chat", authenticate, async (req, res) => {
  try {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message || message.length > 4000) {
      return res.status(400).json(createResponse("Message must be between 1 and 4000 characters", null, {}, ["Invalid message"]));
    }
    
    // Fetch user context for Creator DNA
    const userTopics = await db
      .select({ name: topicsTable.name })
      .from(userTopicsTable)
      .innerJoin(topicsTable, eq(userTopicsTable.topicId, topicsTable.id))
      .where(eq(userTopicsTable.userId, req.user!.id));
      
    const topics = userTopics.map(t => t.name);

    // Provide context to the AI Gateway
    const response = await ai.chat(message, { topics });
    
    res.json(createResponse("AI response generated", { message: response }));
  } catch (err) {
    if (err instanceof AIProviderNotConfiguredError) {
      return res.status(503).json(createResponse("AI Copilot is not configured for this deployment", null, {}, ["ai_not_configured"]));
    }
    res.status(500).json(createResponse("AI Copilot failed", null, {}, ["AI service unavailable"]));
  }
});

// Semantic Search Endpoint
router.get("/search", authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json(createResponse("Query is required", null, {}, ["Query is required"]));
    }
    
    const query = q.trim().slice(0, 200);
    const [shielded, filter] = await Promise.all([
      contactShieldService.getShieldedUserIds(req.user!.id),
      contentSafetyService.getViewerFilter(req.user!.id),
    ]);
    const posts = await postRepository.search(query, 50, [...shielded], filter);
    const results = posts.map((post) => ({ id: post.id, authorId: post.authorId, content: post.content, createdAt: post.createdAt, score: post.score ?? 0 }));

    res.json(createResponse("Search completed", { results, searchMode: "keyword" }));
  } catch (err) {
    res.status(500).json(createResponse("Semantic search failed", null, {}, ["Search service unavailable"]));
  }
});

// Auto-Moderation Hook Endpoint (can be called by a worker)
router.post("/moderate", authenticate, async (req, res) => {
  try {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text || text.length > 5000) {
      return res.status(400).json(createResponse("Text must be between 1 and 5000 characters", null, {}, ["Invalid text"]));
    }
    const analysis = await ai.moderateContent(text);
    res.json(createResponse("Moderation completed", { analysis }));
  } catch (err) {
    if (err instanceof AIProviderNotConfiguredError) {
      return res.status(503).json(createResponse("AI moderation is not configured for this deployment", null, {}, ["ai_not_configured"]));
    }
    res.status(500).json(createResponse("Moderation failed", null, {}, ["Moderation service unavailable"]));
  }
});

export const aiRoutes = router;
export default router;
