import { jest } from "@jest/globals";
jest.unstable_mockModule("@aws-sdk/lib-dynamodb", () => {
  class PutCommand {}
  class ScanCommand {}
  class UpdateCommand {}
  class DeleteCommand {}

  const fakeSend = jest.fn(async (cmd) => {
    if (cmd instanceof PutCommand) return { Attributes: { id: "mock-id" } };
    if (cmd instanceof ScanCommand) return { Items: [{ id: "1", title: "a" }] };
    if (cmd instanceof UpdateCommand) return { Attributes: { id: "1", title: "updated" } };
    if (cmd instanceof DeleteCommand) return {};
    return {};
  });

  return {
    PutCommand,
    ScanCommand,
    UpdateCommand,
    DeleteCommand,
    DynamoDBDocumentClient: { from: () => ({ send: fakeSend }) },
  };
});

jest.unstable_mockModule("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));
