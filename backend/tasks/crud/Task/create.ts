import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const res = (code: number, body?: unknown) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  },
  body: body === undefined ? undefined : JSON.stringify(body)
});

export const createTask = async (event: any) => {
  if (event.httpMethod === "OPTIONS") return res(200, { ok: true });
  const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
  const item = { ...body, id: body.id ?? (globalThis.crypto?.randomUUID?.() ?? String(Date.now())), createdAt: Date.now() };
  await ddb.send(new PutCommand({ TableName: "Tasks", Item: item }));
  return res(201, item);
}
