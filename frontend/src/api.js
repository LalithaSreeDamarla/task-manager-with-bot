// src/api.js
export const API = import.meta.env.VITE_API_URL;

// parse text as JSON if possible; otherwise return the raw text
async function parse(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function assertOk(res) {
  if (!res.ok) {
    const body = await parse(res);
    const msg = typeof body === "string" ? body : body?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
}

export async function listTasks() {
  const res = await fetch(`${API}/tasks`);
  await assertOk(res);
  const data = await parse(res);
  // always return an array
  return Array.isArray(data) ? data : (data?.Items ?? data?.items ?? []);
}

export async function createTask(task) {
  const res = await fetch(`${API}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  await assertOk(res);
  return parse(res);
}

export async function updateTask(id, patch) {
  const res = await fetch(`${API}/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  await assertOk(res);
  return parse(res);
}

export async function deleteTask(id) {
  const res = await fetch(`${API}/tasks/${id}`, { method: "DELETE" });
  await assertOk(res);
  return parse(res);
}

export async function sendChat(prompt, extras = {}) {
  const res = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, ...extras }),
  });
  await assertOk(res);
  return parse(res);
}

export async function getTask(id, opts = {}) {
  const res = await fetch(`${API}/tasks/${id}`, opts);
  if (!res.ok) throw new Error(`getTask ${res.status}`);
  return res.json();
}