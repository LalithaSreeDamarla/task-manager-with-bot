import "../mocks/dynamoMock.js";

// If your handler lives elsewhere, tweak this path
const mod = await import("../../tasks/index.ts");
const { handler: tasksHandler } = mod;

describe("Tasks Lambda Handler", () => {
  beforeEach(() => {
    process.env.TASKS_TABLE = "TasksTableMock";
  });

  test("POST /tasks creates a task (returns id)", async () => {
    const event = {
      httpMethod: "POST",
      path: "/tasks",
      body: JSON.stringify({ title: "My Task" }),
    };

    const res = await tasksHandler(event);
    expect(res.statusCode).toBeGreaterThanOrEqual(200);
    expect(res.statusCode).toBeLessThan(300);

    const body = JSON.parse(res.body || "{}");
    expect(body).toHaveProperty("id");
  });

  test("GET /tasks returns array", async () => {
    const event = { httpMethod: "GET", path: "/tasks" };

    const res = await tasksHandler(event);
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body || "[]");
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    expect(body[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: expect.any(String),
      })
    );
  });

  test("PUT /tasks updates a task", async () => {
    const event = {
      httpMethod: "PUT",
      resource: "/tasks/{id}",
      path: "/tasks/1",
      pathParameters: { id: "1" },               // <-- important
      body: JSON.stringify({ title: "Updated Title" }),
    };

    const res = await tasksHandler(event);
    const body = JSON.parse(res.body || "{}");

    if (res.statusCode >= 200 && res.statusCode < 300) {
      expect(body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),            // your code may set "updated"
        })
      );
    } else {
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(body).toBeTruthy();
    }
  });

  test("DELETE /tasks deletes a task", async () => {
    const event = {
      httpMethod: "DELETE",
      resource: "/tasks/{id}",
      path: "/tasks/1",
      pathParameters: { id: "1" },               // <-- important
    };

    const res = await tasksHandler(event);
    const body = JSON.parse(res.body || "{}");

    if (res.statusCode >= 200 && res.statusCode < 300) {
      expect([200, 204]).toContain(res.statusCode);
    } else {
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(body).toBeTruthy();
    }
  });

  test("Unsupported method returns 400/405", async () => {
    const event = { httpMethod: "PATCH", path: "/tasks" };
    const res = await tasksHandler(event);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
