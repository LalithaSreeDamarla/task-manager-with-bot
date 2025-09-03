// backend/chat/index.js  (ESM)
// Claude 3 tool-use + DynamoDB tools, with solid error handling.

import crypto from "crypto";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand, ScanCommand
} from "@aws-sdk/lib-dynamodb";

const REGION      = process.env.BEDROCK_REGION || "us-east-1";
const MODEL_ID    = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";
const TASKS_TABLE = process.env.TASKS_TABLE;

const bedrock = new BedrockRuntimeClient({ region: REGION });
const ddbDoc  = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};
const j = (code, body) => ({ statusCode: code, headers: CORS, body: JSON.stringify(body) });

const normStatus = (s) => (s === "completed" ? "done" : s);

// ------------------ Tools ------------------
async function createTask(input = {}) {
  const title = (input.title || "").trim();
  if (!title) throw new Error("title is required");
  if (!TASKS_TABLE) throw new Error("TASKS_TABLE env is missing");

  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    title,
    description: input.description ?? "",
    status: normStatus(input.status || "pending"), // "pending" | "done"
    dueDate: input.dueDate ?? null,
    project: input.project ?? null,
    assignedTo: input.assignedTo ?? null,
    labels: Array.isArray(input.labels) ? input.labels : [],
    createdAt: now,
    updatedAt: now,
  };

  await ddbDoc.send(new PutCommand({
    TableName: TASKS_TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));
  return item;
}

async function updateTask(input = {}) {
  const { id, patch } = input;
  if (!id) throw new Error("id is required");
  if (!patch || typeof patch !== "object") throw new Error("patch object is required");

  const allowed = ["title","description","status","dueDate","project","assignedTo","labels"];
  const keys = Object.keys(patch).filter(k => allowed.includes(k));
  if (keys.length === 0) throw new Error("patch has no allowed fields");

  const names = {};
  const values = { ":updatedAt": new Date().toISOString() };
  const sets = keys.map(k => {
    names[`#${k}`] = k;
    values[`:${k}`] = (k === "status") ? normStatus(patch[k]) : patch[k];
    return `#${k} = :${k}`;
  });

  await ddbDoc.send(new UpdateCommand({
    TableName: TASKS_TABLE,
    Key: { id },
    UpdateExpression: `SET ${sets.join(", ")}, updatedAt = :updatedAt`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));

  const got = await ddbDoc.send(new GetCommand({ TableName: TASKS_TABLE, Key: { id } }));
  return got?.Item ?? null;
}

async function findTasks(input = {}) {
  const res = await ddbDoc.send(new ScanCommand({ TableName: TASKS_TABLE, Limit: 1000 }));
  let items = res.Items || [];

  const q = (input.query || "").toLowerCase();
  if (q) {
    items = items.filter(t =>
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (Array.isArray(t.labels) && t.labels.join(" ").toLowerCase().includes(q)) ||
      (t.project && String(t.project).toLowerCase().includes(q)) ||
      (t.assignedTo && String(t.assignedTo).toLowerCase().includes(q)));
  }
  if (input.status)     items = items.filter(t => normStatus(t.status) === normStatus(input.status));
  if (input.project)    items = items.filter(t => t.project === input.project);
  if (input.assignedTo) items = items.filter(t => t.assignedTo === input.assignedTo);
  if (input.dueFrom)    items = items.filter(t => t.dueDate && t.dueDate >= input.dueFrom);
  if (input.dueTo)      items = items.filter(t => t.dueDate && t.dueDate <= input.dueTo);

  items.sort((a,b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const limit = Math.max(1, Math.min(100, input.limit ?? 20));
  return items.slice(0, limit);
}

const TOOL_HANDLERS = { createTask, updateTask, findTasks };

// tools schema (match FE statuses)
const tools = [
  {
    name: "createTask",
    description: "Create a new task",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["pending","done"] },
        dueDate: { type: "string" },
        project: { type: "string" },
        assignedTo: { type: "string" },
        labels: { type: "array", items: { type: "string" } },
      },
      required: ["title"],
    },
  },
  {
    name: "updateTask",
    description: "Update fields of an existing task",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        patch: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            status: { type: "string", enum: ["pending","done"] },
            dueDate: { type: "string" },
            project: { type: "string" },
            assignedTo: { type: "string" },
            labels: { type: "array", items: { type: "string" } },
          },
        },
      },
      required: ["id","patch"],
    },
  },
  {
    name: "findTasks",
    description: "Search tasks",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        status: { type: "string", enum: ["pending","done"] },
        project: { type: "string" },
        assignedTo: { type: "string" },
        dueFrom: { type: "string" },
        dueTo: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
    },
  },
];

// Bedrock call (safe decode + tolerant to text/JSON)
async function callClaude({ messages, tools, max_tokens = 512, temperature = 0.2, system }) {
  if (!MODEL_ID) throw new Error("BEDROCK_MODEL_ID env is missing");

  const body = {
    anthropic_version: "bedrock-2023-05-31",
    system, messages, tools, max_tokens, temperature,
  };

  const out = await bedrock.send(new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  }));

  const txt = Buffer.from(out.body).toString("utf8");
  try { return JSON.parse(txt); } catch { return { content: [{ type: "text", text: txt }] }; }
}

export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

    let payload = {};
    try { payload = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {}); }
    catch { return j(400, { error: "invalid JSON body" }); }

    const prompt  = (payload.prompt || "").trim();
    const context = Array.isArray(payload.context) ? payload.context : [];
    if (!prompt) return j(400, { error: "prompt required" });

    // compact context & cap size
    const lines = context.slice(0, 50).map(t =>
      `• ${t.title || "(untitled)"} | status:${normStatus(t.status || "pending")} | assignee:${t.assignedTo || "-"} | due:${t.dueDate ?? "-"} | project:${t.project || "general"}`
    );
    let ctx = lines.join("\n");
    if (ctx.length > 4000) ctx = ctx.slice(0, 4000) + "\n• …";

    const system =
      "You are TaskBot, a concise assistant for a task manager. " +
      "Use tools to CREATE/UPDATE/FIND tasks when asked. Ask briefly for missing info.";

    const first = await callClaude({
      system, tools, temperature: 0.2, max_tokens: 512,
      messages: [{ role: "user", content: [{ type: "text", text: `Tasks Context:\n${ctx || "(none)"}\n\nUser request: ${prompt}` }] }],
    });

    const toolCalls = (first.content || []).filter(b => b.type === "tool_use");
    if (toolCalls.length === 0) {
      const reply = (first.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim() || "(no reply)";
      return j(200, { reply, toolCalls: [], toolResults: [] });
    }

    const toolResults = [];
    for (const tc of toolCalls) {
      try {
        const fn = TOOL_HANDLERS[tc.name];
        if (!fn) throw new Error(`Unknown tool: ${tc.name}`);
        const result = await fn(tc.input || {});
        toolResults.push({ tool_use_id: tc.id, name: tc.name, result });
      } catch (e) {
        console.error("TOOL_ERROR", tc.name, e);
        toolResults.push({ tool_use_id: tc.id, name: tc.name, error: e.message || String(e) });
      }
    }

    const second = await callClaude({
      system, tools, temperature: 0.2, max_tokens: 512,
      messages: [
        { role: "user", content: [{ type: "text", text: `Tasks Context:\n${ctx || "(none)"}\n\nUser request: ${prompt}` }] },
        { role: "assistant", content: first.content || [] },
        { role: "user", content: toolResults.map(tr => ({ type: "tool_result", tool_use_id: tr.tool_use_id, content: JSON.stringify(tr.error ? { error: tr.error } : tr.result) })) },
      ],
    });

    const finalText = (second.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim() || "Done.";
    return j(200, { reply: finalText, toolCalls, toolResults });
  } catch (e) {
    console.error("CHAT_ERROR", e);
    return j(500, { error: "Chat error", message: String(e) });
  }
};
