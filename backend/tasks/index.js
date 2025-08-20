// index.js — Lambda for /tasks CRUD backed by DynamoDB.
// Uses AWS SDK v3 DocumentClient for JSON-friendly reads/writes.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";

// Reuse connections across invocations (perf).
const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

// Injected by SAM → see template.yaml Globals.Environment
const TABLE = process.env.TASKS_TABLE;

// Helper to build HTTP JSON responses with CORS
const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // allow browser calls (tighten later)
  },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  // event has httpMethod, pathParameters, queryStringParameters, body, etc.
  console.log("REQUEST:", JSON.stringify({
    method: event.httpMethod,
    path: event.path,
    qs: event.queryStringParameters,
    body: event.body
  }));

  try {
    const { httpMethod } = event;

    // ------- GET /tasks -----------
    if (httpMethod === "GET") {
      // Simple list (later: filter by status/project/q with Scan + FilterExpression)
      const data = await ddb.send(new ScanCommand({ TableName: TABLE }));
      return json(200, data.Items ?? []);
    }

    // ------- POST /tasks ----------
    if (httpMethod === "POST") {
      // Parse JSON body safely
      const body = JSON.parse(event.body || "{}");

      // Minimal validation
      if (!body.title || typeof body.title !== "string") {
        return json(400, { message: "title is required (string)" });
      }

      const now = new Date().toISOString();
      const item = {
        id: uuid(),
        title: body.title,
        assignedTo: body.assignedTo ?? "",
        dueDate: body.dueDate ?? null, // ISO string or null
        status: body.status ?? "pending", // pending | completed
        project: body.project ?? "general",
        createdAt: now,
        updatedAt: now
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return json(201, item);
    }

    // ------- PUT /tasks ----------

    if (httpMethod === "PUT") {
      const id = event.pathParameters?.id;
      if (!id) return json(400, { message: "Missing path param: id" });

      const body = JSON.parse(event.body || "{}");

      // Build a single SET expression with all fields
      const params = {
        TableName: TABLE,
        Key: { id },
        UpdateExpression:
          "SET #title = :title, #assignedTo = :assignedTo, #dueDate = :dueDate, #status = :status, #project = :project, #updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#title": "title",
          "#assignedTo": "assignedTo",
          "#dueDate": "dueDate",
          "#status": "status",
          "#project": "project",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":title": body.title ?? "",
          ":assignedTo": body.assignedTo ?? "",
          ":dueDate": body.dueDate ?? null,
          ":status": body.status ?? "pending",
          ":project": body.project ?? "general",
          ":updatedAt": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      };

      const out = await ddb.send(new UpdateCommand(params));
      return json(200, out.Attributes);
    }

    // ------- DELETE /tasks/{id} ---
    if (httpMethod === "DELETE") {
      const id = event.pathParameters?.id;
      if (!id) return json(400, { message: "Missing path param: id" });
      await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { id } }));
      return json(204, {}); // no content
    }

    // ---- Anything else ----
    return json(405, { message: "Method Not Allowed" });

  } catch (err) {
    console.error("ERROR:", err);
    // Return safe error message to caller
    return json(500, { message: "Internal Server Error" });
  }
};
