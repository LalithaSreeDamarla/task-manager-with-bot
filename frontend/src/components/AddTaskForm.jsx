import { useState } from "react";
import { sendChat } from "../api";

// Enable/disable the homework hook without touching App.jsx
const ENABLE_PLANNER = true;

export default function AddTaskForm({ onCreate, loading }) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [project, setProject] = useState("general");
  const [due, setDue] = useState("");             // HTML date value (yyyy-mm-dd)
  const [status, setStatus] = useState("pending"); // "pending" | "done"

  const reset = () => {
    setTitle("");
    setAssignee("");
    setProject("general");
    setDue("");
    setStatus("pending");
  };

  const submit = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return alert("Title is required");

    // Generate id here so we can pass it to the planner after create
    const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());

    const payload = {
      id,
      title: title.trim(),
      assignedTo: assignee || "-",
      project,
      status: "pending",                 // keep "pending" | "done"
      createdAt: Date.now(),
      dueDate: due ? Date.parse(due) : null,   // TaskList formatter handles string/number/null
    };

    try {
      await onCreate(payload);   // App.jsx will call createTask + update state

      // --- Homework hook: ask the bot to generate subtasks (non-blocking) ---
      if (ENABLE_PLANNER) {
        sendChat(
          `Break the task into 3–5 actionable subtasks (short titles only): "${t}"`,
          { mode: "plan", parentId: id }
        ).catch((e) => {
          // Don't disrupt UX if Bedrock/Chat isn't ready yet
          console.warn("planner skipped:", e?.message || e);
        });
      }

      reset();
    } catch (e) {
      console.error(e);
      alert("Create failed.");
    }
  };

  return (
    <form className="row" onSubmit={submit} style={{ gap: 8, alignItems: "center" }}>
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        placeholder="Assigned To"
        value={assignee}
        onChange={(e) => setAssignee(e.target.value)}
      />
      <input
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
      />
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="pending">Pending</option>
        <option value="done">Done</option>
      </select>
      <input
        placeholder="project"
        value={project}
        onChange={(e) => setProject(e.target.value)}
      />
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create Task"}
      </button>
    </form>
  );
}
