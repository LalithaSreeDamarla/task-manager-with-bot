import { useEffect, useState } from "react";
import { listTasks, createTask, updateTask, deleteTask, API_BASE } from "./api";
import AddTaskForm from "./components/AddTaskForm";
import TaskList from "./components/TaskList";
import Chatbot from "./components/Chatbot";

// Same Task UI as you had; we append the Chatbot UI.
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => { (async () => setTasks(await listTasks()))(); }, []);

  const shown = tasks.filter(t => {
    const okStatus = filter === "all" ? true : t.status === filter;
    const hay = (t.title + " " + (t.assignedTo||"") + " " + (t.project||"")).toLowerCase();
    const okQ = q ? hay.includes(q.toLowerCase()) : true;
    return okStatus && okQ;
  });

  const onCreate = async (payload) => {
    setLoading(true);
    try { const created = await createTask(payload); setTasks(p => [created, ...p]); }
    catch (e) { alert("Create failed: " + (e.message || JSON.stringify(e))); }
    finally { setLoading(false); }
  };

  const onToggleStatus = async (t) => {
    const next = { ...t, status: t.status === "completed" ? "pending" : "completed" };
    const snapshot = tasks;
    setTasks(p => p.map(x => x.id === t.id ? next : x));
    try { await updateTask(t.id, next); }
    catch (e) { alert("Update failed, rolling back"); setTasks(snapshot); }
  };

  const onDelete = async (t) => {
    const snapshot = tasks;
    setTasks(p => p.filter(x => x.id !== t.id));
    try { await deleteTask(t.id); }
    catch (e) { alert("Delete failed, rolling back"); setTasks(snapshot); }
  };

  return (
    <div className="container">
      <h1>Task Manager</h1>

      <div className="toolbar">
        <label>Filter:&nbsp;
          <select value={filter} onChange={(e)=>setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <input style={{ flex:1 }} placeholder="Search title / assignee / project" value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      <h2>Add New Task</h2>
      <AddTaskForm onCreate={onCreate} loading={loading} />

      <h2 style={{ marginTop: 20 }}>Task List</h2>
      <TaskList tasks={shown} onToggleStatus={onToggleStatus} onDelete={onDelete} />

      <h2 style={{ marginTop: 28 }}>Chat Assistant</h2>
      <Chatbot apiBase={API_BASE} tasks={tasks} />   
    </div>
  );
}
