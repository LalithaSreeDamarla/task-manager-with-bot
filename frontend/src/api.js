// src/api.js
export const API_BASE = import.meta.env.VITE_API_BASE;
const j = (r) => (r.ok ? r.json() : r.json().then(e => { throw e; }));

export const listTasks = () =>
  fetch(`${API_BASE}/tasks`).then(j);

export const createTask = (payload) =>
  fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(j);

export const updateTask = (id, payload) =>
  fetch(`${API_BASE}/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(j);

export const deleteTask = (id) =>
  fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" })
    .then(r => (r.ok ? {} : j(r)));
