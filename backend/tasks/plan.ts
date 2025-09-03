// backend/tasks/plan.ts
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const REGION = process.env.BEDROCK_REGION || "us-east-1";
const MODEL  = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

const bedrock = new BedrockRuntimeClient({ region: REGION });

export type Plan = { summary?: string; steps: { title: string; detail?: string }[] };

export async function generatePlanForTask(task: {
  title: string; description?: string; project?: string; dueDate?: string | null;
}): Promise<Plan> {
  const system =
    'Return ONLY JSON in this schema: {"summary": string, "steps":[{"title": string, "detail": string}]}. ' +
    "No backticks, no prose. Keep 5–10 concrete steps for our stack (React/Vite, API Gateway, Lambda Node 20, DynamoDB, AWS SAM).";

  const user =
    `Define a step-by-step plan to accomplish this high-level story.\n` +
    `Title: ${task.title}\n` +
    `Description: ${task.description || ""}\n` +
    `Project: ${task.project || ""}\n` +
    `DueDate: ${task.dueDate || ""}\n` +
    `Return 5–10 steps.`;

  const body = {
    anthropic_version: "bedrock-2023-05-31",
    system,
    messages: [{ role: "user", content: [{ type: "text", text: user }] }],
    max_tokens: 700,
    temperature: 0.2,
  };

  const out = await bedrock.send(
    new InvokeModelCommand({
      modelId: MODEL,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    })
  );

  const raw = new TextDecoder().decode(out.body);

  let text = raw;
  try {
    const parsed = JSON.parse(raw);
    text = parsed?.content?.[0]?.text ?? parsed?.output_text ?? raw;
  } catch {/* raw was already text */}

  try {
    return JSON.parse(text);
  } catch {
    // Fallback: turn bullets into steps
    const steps = text
      .split(/\r?\n+/)
      .map(s => s.replace(/^\s*[-•\d.]+\s*/, ""))
      .filter(Boolean)
      .slice(0, 10)
      .map(title => ({ title }));
    return { summary: "Auto-generated plan", steps };
  }
}
