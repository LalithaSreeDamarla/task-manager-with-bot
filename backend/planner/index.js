// DynamoDB Stream -> generate plan for new tasks -> write to item.plan

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const REGION = process.env.BEDROCK_REGION || "us-east-1";
const MODEL  = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";
const TABLE  = process.env.TASKS_TABLE;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const bedrock = new BedrockRuntimeClient({ region: REGION });

async function generatePlan(task) {
  const system =
    'Return ONLY JSON in this schema: {"summary": string, "steps":[{"title": string, "detail": string}]}. ' +
    "No backticks, no prose. Keep 5-10 concrete steps suitable for React/Vite, API Gateway, Lambda (Node 20), DynamoDB, AWS SAM.";

  const user =
    `Define a step-by-step plan to accomplish this high-level story.\n` +
    `Title: ${task.title}\n` +
    `Description: ${task.description || ""}\n` +
    `Project: ${task.project || ""}\n` +
    `DueDate: ${task.dueDate || ""}\n` +
    `Return 5-10 steps.`;

  const body = {
    anthropic_version: "bedrock-2023-05-31",
    system,
    messages: [{ role: "user", content: [{ type: "text", text: user }] }],
    max_tokens: 700,
    temperature: 0.2
  };

  const res = await bedrock.send(new InvokeModelCommand({
    modelId: MODEL,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  }));

  const txt = Buffer.from(res.body).toString("utf8");
  let jsonText = txt;
  try { const p = JSON.parse(txt); jsonText = p?.content?.[0]?.text ?? p?.output_text ?? txt; } catch {}
  try { return JSON.parse(jsonText); } catch {
    const steps = jsonText.split(/\r?\n+/)
      .map(s => s.replace(/^\s*[-•\d.]+\s*/, ""))
      .filter(Boolean).slice(0, 10)
      .map(title => ({ title }));
    return { summary: "Auto-generated plan", steps };
  }
}

exports.handler = async (event) => {
  for (const rec of event.Records || []) {
    if (rec.eventName !== "INSERT") continue;
    const img = rec.dynamodb && rec.dynamodb.NewImage;
    if (!img) continue;
    const item = unmarshall(img);
    const { id, title } = item || {};
    if (!id || !title) continue;
    if (item.plan) continue;

    try {
      const plan = await generatePlan(item);
      await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id },
        UpdateExpression: "SET #plan = :p, updatedAt = :u",
        ExpressionAttributeNames: { "#plan": "plan" },
        ExpressionAttributeValues: { ":p": plan, ":u": new Date().toISOString() }
      }));
      console.log("plan_written", id, (plan.steps || []).length);
    } catch (e) {
      console.error("plan_error", id, e);
    }
  }
  return {};
};
