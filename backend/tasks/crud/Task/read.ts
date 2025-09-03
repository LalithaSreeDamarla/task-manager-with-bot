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

export const listTasks = async () => {
  const out = await ddb.send(new ScanCommand({ TableName: "Tasks" }));
  return res(200, out.Items ?? []);
}

export const getTask = async (event: any) => {
  const id = event.pathParameters?.id;
  if (!id) return res(400, { error: "id required" });
  const out = await ddb.send(new GetCommand({ TableName: "Tasks", Key: { "id": id } }));
  return out.Item ? res(200, out.Item) : res(404, { error: "task not found" });
}
