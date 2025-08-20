// index.js — POST /chat -> calls Bedrock (Claude 3 Haiku) and returns text reply.
// Supports grounding with a compact tasks "context" sent by the client.

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const REGION   = process.env.BEDROCK_REGION || "us-east-1";
const MODEL_ID = process.env.BEDROCK_MODEL_ID; // e.g., anthropic.claude-3-haiku-20240307-v1:0

// Reuse client between invocations
const client = new BedrockRuntimeClient({ region: REGION });

// Helper to build HTTP responses (with CORS for the browser)
const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

/**
 * Expected body:
 * {
 *   "prompt": "user question",
 *   "context": [ { id, title, status, assignedTo, project, dueDate }, ... ]  // optional
 * }
 */
export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
    const prompt = (body.prompt || "").trim();
    const context = Array.isArray(body.context) ? body.context : [];

    if (!prompt) return json(400, { message: "Missing prompt" });

    // ---- Compact context into short, model-friendly lines ----
    const lines = context
      .filter(Boolean)
      .slice(0, 100) // cap to avoid very large payloads
      .map((t) => {
        const due = t?.dueDate ?? "-";
        const who = t?.assignedTo || "-";
        const proj = t?.project || "general";
        const status = t?.status || "pending";
        const title = t?.title || "(untitled)";
        return `• ${title} | status:${status} | assignee:${who} | due:${due} | project:${proj}`;
      });

    let contextText = lines.join("\n");
    if (contextText.length > 8000) contextText = contextText.slice(0, 8000) + "\n• …";

    // ---- System guidance for Claude ----
    const system = [
      "You are TaskBot, a concise assistant for a task manager.",
      "Use the provided 'Tasks Context' to answer questions about tasks, assignees, deadlines, and status.",
      "If the context doesn't contain the answer, say so briefly.",
      "Prefer short, direct answers and bullet lists. Do not invent tasks."
    ].join(" ");

    // ---- Claude messages payload for Bedrock ----
    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      system,
      max_tokens: 512,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Tasks Context:\n${contextText || "(none)"}\n\n` +
                `User question: ${prompt}`,
            },
          ],
        },
      ],
    };

    // Log context size for debugging in CloudWatch
    console.log("chat_ctx", { items: context.length, chars: contextText.length });

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    });

    const response = await client.send(command);

    // Body is a Uint8Array
    const text = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(text);

    // Claude on Bedrock may return output_text or content[0].text
    const reply =
      parsed.output_text ??
      parsed.content?.[0]?.text ??
      "(no reply)";

    return json(200, { reply });
  } catch (err) {
    console.error("Chat error:", err);
    // Keep response generic in prod
    return json(500, { message: "Chat error" });
  }
};
