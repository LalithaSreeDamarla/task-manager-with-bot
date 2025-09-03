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

export const updateTask = async (event: any) => {
  const id = event.pathParameters?.id;
  if (!id) return res(400, { error: "id required" });
  const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
  const names: Record<string,string> = {}; const values: Record<string,unknown> = {}; const sets: string[] = [];
  for (const [k,v] of Object.entries(body)) { if (v === undefined) continue; names["#"+k]=k; values[":"+k]=v; sets.push(`#${k} = :${k}`); }
  if (sets.length === 0) return res(400, { error: "no fields" });
  const out = await ddb.send(new UpdateCommand({
    TableName: "Tasks", Key: { "id": id },
    UpdateExpression: `SET ${sets.join(", ")}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: "ALL_NEW"
  }));
  return res(200, out.Attributes);
}
