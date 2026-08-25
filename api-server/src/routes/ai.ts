import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { ai } from "../services/ai/AIGateway.js";
import { db } from "@workspace/db";
import { userTopicsTable, topicsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Copilot Ideation Chat
router.post("/chat", authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    
    // Fetch user context for Creator DNA
    const userTopics = await db
      .select({ name: topicsTable.name })
      .from(userTopicsTable)
      .innerJoin(topicsTable, eq(userTopicsTable.topicId, topicsTable.id))
      .where(eq(userTopicsTable.userId, req.user!.id));
      
    const topics = userTopics.map(t => t.name);

    // Provide context to the AI Gateway
    const response = await ai.chat(message, { topics });
    
    res.json({ success: true, message: response });
  } catch (err) {
    res.status(500).json({ error: "AI Copilot failed" });
  }
});

// Semantic Search Endpoint
router.get("/search", authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Query is required" });
    }
    
    // Simulate Vector Embedding generation
    const vector = await ai.createEmbedding(q);
    
    // Fallback/Simulated search results if pgvector is not natively queryable here
    // In production, you would run a vector similarity search: 
    // SELECT id, content, 1 - (embedding <=> $vector) as similarity FROM posts ORDER BY similarity DESC
    
    const results = [
      { id: "mock_post_1", content: `Mock result for: ${q}`, score: 0.95 },
      { id: "mock_post_2", content: `Related semantic result to: ${q}`, score: 0.88 }
    ];

    res.json({ success: true, results, vector_metadata: { dimensions: vector.length } });
  } catch (err) {
    res.status(500).json({ error: "Semantic search failed" });
  }
});

// Auto-Moderation Hook Endpoint (can be called by a worker)
router.post("/moderate", authenticate, async (req, res) => {
  try {
    const { text } = req.body;
    const analysis = await ai.moderateContent(text);
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: "Moderation failed" });
  }
});

export const aiRoutes = router;
export default router;
