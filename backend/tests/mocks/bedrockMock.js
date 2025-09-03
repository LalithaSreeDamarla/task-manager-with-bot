import { jest } from "@jest/globals";
jest.unstable_mockModule("@aws-sdk/client-bedrock-runtime", () => {
  class InvokeModelCommand {}
  class BedrockRuntimeClient {
    send = jest.fn(async () => {
      const bodyText = JSON.stringify({ output_text: "ok from mock" });
      return { body: new TextEncoder().encode(bodyText) };
    });
  }
  return { BedrockRuntimeClient, InvokeModelCommand };
});
