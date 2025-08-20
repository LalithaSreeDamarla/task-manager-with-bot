// index.js — minimal Lambda for GET /health
// Returns JSON with CORS headers so browsers can call it.

/** Helper to build an API Gateway proxy response */
const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    // Basic CORS: allow any origin; we'll tighten later if needed.
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

/** Lambda entrypoint */
export const handler = async (event) => {
  // event contains details from API Gateway (path, query, headers, etc.)
  // Logging to CloudWatch helps confirm wiring.
  console.log("Received event:", JSON.stringify(event));

  const payload = {
    service: "task-manager-with-bot",
    status: "ok",
    time: new Date().toISOString(),
  };

  return json(200, payload);
};
