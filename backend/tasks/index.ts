// backend/tasks/index.ts
// Thin router that forwards to Smithy-generated CRUD handlers

import { createTask } from "./crud/Task/create";
import { listTasks, getTask } from "./crud/Task/read";
import { updateTask } from "./crud/Task/update";
import { deleteTask } from "./crud/Task/delete";

type APIGEvent = {
  httpMethod: string;
  path: string;
  resource?: string;
  pathParameters?: Record<string, string> | null;
  queryStringParameters?: Record<string, string> | null;
  body?: string | null;
};

type APIGResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
};

export const handler = async (event: APIGEvent): Promise<APIGResponse> => {
  const { httpMethod, path } = event;

  // Preflight (in case API Gateway forwards OPTIONS to the Lambda)
  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      },
      body: "",
    };
  }

  // /tasks
  if (path === "/tasks") {
    if (httpMethod === "GET")  return listTasks();
    if (httpMethod === "POST") return createTask(event as any);
  }

  // /tasks/{id}
  if (/^\/tasks\/[\w-]+$/.test(path)) {
    if (httpMethod === "GET")    return getTask(event as any);
    if (httpMethod === "PUT")    return updateTask(event as any);
    if (httpMethod === "DELETE") return deleteTask(event as any);
  }

  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ error: "route not found", method: httpMethod, path }),
  };
};
