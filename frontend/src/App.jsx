import { useEffect, useState } from "react";
import { listTasks, createTask, updateTask, deleteTask, getTask } from "./api";
import AddTaskForm from "./components/AddTaskForm";
import TaskList from "./components/TaskList";
import Chatbot from "./components/Chatbot";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" | "pending" | "completed"
  const [q, setQ] = useState("");

  useEffect(() => {
    listTasks()
      .then(d => setTasks(Array.isArray(d) ? d : []))
      .catch(err => { console.error(err); setTasks([]); });
  }, []);

  // map UI filter to stored values ("completed" -> "done")
  const mapFilterToStore = (f) => (f === "completed" ? "done" : f);
  const normalizeStatus = (s) => (s === "completed" ? "done" : s);

  const shown = tasks.filter((t) => {
    const okStatus =
      filter === "all"
        ? true
        : normalizeStatus(t.status) === mapFilterToStore(filter);
    const hay = `${t.title} ${t.assignedTo || ""} ${t.project || ""}`.toLowerCase();
    const okQ = q ? hay.includes(q.toLowerCase()) : true;
    return okStatus && okQ;
  });

  const onCreate = async (payload) => {
    setLoading(true);
    try {
      const created = await createTask(payload);
      setTasks((p) => [created, ...p]);

      // If backend already returned a plan, no need to poll
      if (created?.plan?.steps?.length) return;

      // Backoff waits (~12s total): 0.9s → 1.2s → … → 3.5s
      const waits = [900, 1200, 1500, 1800, 2200, 2600, 3000, 3500];
      for (const ms of waits) {
        await new Promise(r => setTimeout(r, ms));
        const fresh = await getTask(created.id);
        if (fresh?.plan?.steps?.length) {
          setTasks(p => p.map(x => x.id === created.id ? fresh : x));
          break;
        }
      }
    } catch (e) {
      alert("Create failed: " + (e.message || JSON.stringify(e)));
    } finally {
      setLoading(false);
    }
  };

  // NEW: receives (task, nextStatus) from TaskList and only sends the patch
  const onToggleStatus = async (t, nextStatus) => {
  const prev = t.status;
  const prevUpdated = t.updatedAt;
  setTasks(p => p.map(x => x.id === t.id ? { ...x, status: nextStatus, updatedAt: Date.now() } : x));
  try {
    const updated = await updateTask(t.id, { status: nextStatus });
    // if API returns the full item, reconcile:
    if (updated?.id) setTasks(p => p.map(x => x.id === t.id ? { ...x, ...updated } : x));
  } catch (e) {
    console.error(e);
    alert("Update failed, rolling back");
    setTasks(p => p.map(x => x.id === t.id ? { ...x, status: prev, updatedAt: prevUpdated } : x));
  }
  };

  // accept id (matches new TaskList)
  const onDelete = async (id) => {
    const snapshot = tasks;
    setTasks((p) => p.filter((x) => x.id !== id));
    try {
      await deleteTask(id);
    } catch (e) {
      alert("Delete failed, rolling back");
      console.error(e);
      setTasks(snapshot);
    }
  };

  return (
    <div className="container">
      <h1>Task Manager</h1>

      <div className="toolbar">
        <label>
          Filter:&nbsp;
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <input
          style={{ flex: 1 }}
          placeholder="Search title / assignee / project"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <h2>Add New Task</h2>
      <AddTaskForm onCreate={onCreate} loading={loading} />

      <h2 style={{ marginTop: 20 }}>Task List</h2>
      <TaskList
        tasks={shown}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
      />

      <h2 style={{ marginTop: 28 }}>Chat Assistant</h2>
      <Chatbot />
    </div>
  );
}
