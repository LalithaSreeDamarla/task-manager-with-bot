// writes generated/lambdas/*.js + generated/infra/template.yaml
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outL = path.join(root, "generated", "lambdas");
const outI = path.join(root, "generated", "infra");
fs.mkdirSync(outL, { recursive: true });
fs.mkdirSync(outI, { recursive: true });

// CommonJS + AWS SDK v2 (built into Lambda runtime)
const h = (n, b) => `// ${n}.js — generated (CommonJS + AWS SDK v2)
const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.TASKS_TABLE;

exports.handler = async (event) => {
  try {
    ${b.c}
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ message: "Internal error" }) };
  }
};
`;

const files = {
  createTask: h("createTask", {
    c: `const input = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
    if (!input.title) return { statusCode: 400, body: JSON.stringify({ message: "title required" }) };
    const now = new Date().toISOString();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,10);
    const item = { id, title: input.title, status: input.status || "PENDING", project: input.project || "", dueDate: input.dueDate || null, createdAt: now, updatedAt: now };
    await ddb.put({ TableName: TABLE, Item: item }).promise();
    return { statusCode: 201, body: JSON.stringify(item) };`
  }),
  getTask: h("getTask", {
    c: `const id = event.pathParameters?.id;
    if (!id) return { statusCode: 400, body: JSON.stringify({ message: "id required" }) };
    const res = await ddb.get({ TableName: TABLE, Key: { id } }).promise();
    if (!res.Item) return { statusCode: 404, body: JSON.stringify({ message: "not found" }) };
    return { statusCode: 200, body: JSON.stringify(res.Item) };`
  }),
  listTasks: h("listTasks", {
    c: `const r = await ddb.scan({ TableName: TABLE }).promise();
    return { statusCode: 200, body: JSON.stringify({ items: r.Items || [] }) };`
  }),
  updateTask: h("updateTask", {
    c: `const id = event.pathParameters?.id;
    if (!id) return { statusCode: 400, body: JSON.stringify({ message: "id required" }) };
    const input = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
    const fields = ["title", "status", "project", "dueDate"];
    const sets = [], names = {}, values = {};
    for (const f of fields) if (f in input) { sets.push("#"+f+" = :"+f); names["#"+f] = f; values[":"+f] = input[f]; }
    names["#updatedAt"] = "updatedAt"; values[":updatedAt"] = new Date().toISOString(); sets.push("#updatedAt = :updatedAt");
    if (sets.length === 0) return { statusCode: 400, body: JSON.stringify({ message: "no fields to update" }) };
    const r = await ddb.update({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: "SET " + sets.join(", "),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW"
    }).promise();
    return { statusCode: 200, body: JSON.stringify(r.Attributes) };`
  }),
  deleteTask: h("deleteTask", {
    c: `const id = event.pathParameters?.id;
    if (!id) return { statusCode: 400, body: JSON.stringify({ message: "id required" }) };
    await ddb.delete({ TableName: TABLE, Key: { id } }).promise();
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };`
  }),
};

for (const [n, c] of Object.entries(files)) {
  fs.writeFileSync(path.join(outL, n + ".js"), c);
}

const sam = `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: TaskService CRUD (generated)

Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 10
    MemorySize: 256
    Environment:
      Variables:
        TASKS_TABLE: !Ref TasksTable

Resources:
  Api:
    Type: AWS::Serverless::Api
    Properties:
      StageName: Prod
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,Authorization'"
        AllowOrigin: "'*'"

  CreateTaskFn:
    Type: AWS::Serverless::Function
    Properties:
      Handler: createTask.handler
      CodeUri: ../lambdas
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref TasksTable
      Events:
        PostTask:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /tasks
            Method: POST

  GetTaskFn:
    Type: AWS::Serverless::Function
    Properties:
      Handler: getTask.handler
      CodeUri: ../lambdas
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref TasksTable
      Events:
        GetTask:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /tasks/{id}
            Method: GET

  ListTasksFn:
    Type: AWS::Serverless::Function
    Properties:
      Handler: listTasks.handler
      CodeUri: ../lambdas
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref TasksTable
      Events:
        ListTasks:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /tasks
            Method: GET

  UpdateTaskFn:
    Type: AWS::Serverless::Function
    Properties:
      Handler: updateTask.handler
      CodeUri: ../lambdas
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref TasksTable
      Events:
        PutTask:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /tasks/{id}
            Method: PUT

  DeleteTaskFn:
    Type: AWS::Serverless::Function
    Properties:
      Handler: deleteTask.handler
      CodeUri: ../lambdas
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref TasksTable
      Events:
        DelTask:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /tasks/{id}
            Method: DELETE

  TasksTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH

Outputs:
  ApiUrl:
    Value: !Sub "https://\${Api}.execute-api.\${AWS::Region}.amazonaws.com/Prod"
`;

fs.writeFileSync(path.join(outI, "template.yaml"), sam);
console.log("✅ Generated lambdas and SAM template in generated/");
