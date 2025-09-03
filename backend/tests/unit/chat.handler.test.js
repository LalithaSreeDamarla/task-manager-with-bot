import "../mocks/bedrockMock.js";

// adjust path if your file is chat/handler.js
const mod = await import("../../chat/index.js");
const { handler: chatHandler } = mod;

describe("Chat Lambda Handler (Bedrock)", () => {
  beforeEach(() => {
    process.env.BEDROCK_REGION = "us-east-1";
    process.env.BEDROCK_MODEL_ID = "anthropic.claude-3-haiku";
  });

  test("POST /chat returns mocked response", async () => {
    const event = {
      httpMethod: "POST",
      path: "/chat",
      body: JSON.stringify({ prompt: "hello" }),
    };
    const res = await chatHandler(event);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body || "{}");
    expect(body).toBeTruthy(); // keep loose; tighten later to your exact shape
  });
});
