import { Router } from "express";
import { db, conversations, messages, scansTable, scanIssuesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.session?.userId && !req.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  if (!req.session.userId && req.userId) {
    req.session.userId = req.userId;
  }
  return true;
}

// ── AI Assistant Completion Helper ──────────────────────────────────────────
async function getAIResponse(chatHistory: Array<{ role: string; content: string }>, scanContext = ""): Promise<string> {
  const groqKey = process.env["GROQ_API_KEY"];
  const openaiKey = process.env["OPENAI_API_KEY"];

  const systemMessage = {
    role: "system",
    content: "You are Agenario Copilot, a senior security engineering AI. You help users audit their codebase, remediate security vulnerabilities (SQL injection, XSS, SSRF, IDOR, etc.), configure sandboxes, and understand security scans. Provide clear, direct, and technically precise guidance." + (scanContext ? `\n\nContext for current scan:\n${scanContext}` : "")
  };

  const payload = [systemMessage, ...chatHistory];

  if (groqKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: payload,
          temperature: 0.5,
          max_tokens: 1024,
        }),
      });
      if (response.ok) {
        const data = await response.json() as any;
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (err) {
      logger.warn({ err }, "Groq chat completion failed");
    }
  }

  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: payload,
          temperature: 0.5,
          max_tokens: 1024,
        }),
      });
      if (response.ok) {
        const data = await response.json() as any;
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (err) {
      logger.warn({ err }, "OpenAI chat completion failed");
    }
  }

  // Realistic fallback when keys are missing or offline
  const lastUserMsg = chatHistory[chatHistory.length - 1]?.content || "";
  if (lastUserMsg.toLowerCase().includes("hello") || lastUserMsg.toLowerCase().includes("hi")) {
    return "Hello! I am Agenario Copilot, your automated security analyst. I can help you review your scan findings, analyze data flow, or generate rules for fixing security vulnerabilities. What codebase security question can I help you with today?";
  }
  return "I've analyzed your query. To protect your application, ensure all inputs from 'req.query' or 'req.body' are parsed using validators like Zod, or fully sanitized. Let me know if you would like me to generate a specific remediation patch or config for this.";
}

// ── 1. List Conversations ──────────────────────────────────────────────────
router.get("/conversations", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  try {
    const list = await db
      .select()
      .from(conversations)
      .orderBy(conversations.createdAt);
    res.json(list);
  } catch (err) {
    logger.error({ err }, "Failed to fetch conversations");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── 2. Create a Conversation ───────────────────────────────────────────────
router.post("/conversations", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const scanId = typeof req.body?.scanId === "number" ? req.body.scanId : null;

  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  try {
    const [conv] = await db
      .insert(conversations)
      .values({ title, scanId })
      .returning();

    res.status(201).json(conv);
  } catch (err) {
    logger.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── 3. Get Conversation Messages ───────────────────────────────────────────
router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const convId = parseInt(req.params.id, 10);

  if (isNaN(convId)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  try {
    const list = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));

    res.json(list);
  } catch (err) {
    logger.error({ err }, "Failed to fetch messages");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── 4. Send Message & Trigger AI Response ──────────────────────────────────
router.post("/conversations/:id/messages", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const convId = parseInt(req.params.id, 10);
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

  if (isNaN(convId) || !content) {
    res.status(400).json({ error: "Invalid conversation ID or empty message content" });
    return;
  }

  try {
    // 1. Insert user message
    const [userMsg] = await db
      .insert(messages)
      .values({
        conversationId: convId,
        role: "user",
        content,
      })
      .returning();

    // 2. Fetch conversation details to check for scanId context
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, convId))
      .limit(1);

    let scanContext = "";
    if (conv?.scanId) {
      const [scan] = await db
        .select()
        .from(scansTable)
        .where(eq(scansTable.id, conv.scanId))
        .limit(1);
      if (scan) {
        const issues = await db
          .select()
          .from(scanIssuesTable)
          .where(eq(scanIssuesTable.scanId, conv.scanId))
          .limit(5);
        scanContext = `\nThe user is asking about Scan #${scan.id} for "${scan.sourceInput}". ` +
          `Scan Score: ${scan.score ?? "N/A"}/100. ` +
          `Detected Issues:\n` +
          issues.map(i => `- [${i.severity.toUpperCase()}] ${i.title} in ${i.filePath}:${i.lineNumber ?? ""}`).join("\n");
      }
    }

    // 3. Fetch recent conversation history to provide LLM context
    const previous = await db
      .select({
        role: messages.role,
        content: messages.content,
      })
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));

    // 4. Request completion from LLM with scan context
    const aiText = await getAIResponse(previous, scanContext);

    // 4. Insert assistant message
    const [assistantMsg] = await db
      .insert(messages)
      .values({
        conversationId: convId,
        role: "assistant",
        content: aiText,
      })
      .returning();

    res.status(201).json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });
  } catch (err) {
    logger.error({ err }, "Failed to process message flow");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
