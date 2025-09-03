import { jest } from "@jest/globals";

// Simple, deterministic stubs so component tests don't hit real network
export const listTasks  = jest.fn(async () => [{ id: "t1", title: "Demo Task" }]);
export const createTask = jest.fn(async (x) => ({ id: "t2", ...x }));
export const updateTask = jest.fn(async (id, x) => ({ id, ...x }));
export const deleteTask = jest.fn(async () => ({}));
export const getTask    = jest.fn(async (id) => ({ id, title: "Demo Task" }));
export const sendChat   = jest.fn(async (prompt) => ({ reply: "ok" }));
