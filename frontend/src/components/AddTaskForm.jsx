import { useState } from "react";

// Minimal controlled form. Backend still validates.
export default function AddTaskForm({ onCreate, loading }) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState("pending");
  const [project, setProject] = useState("general");
  const [dueDate, setDueDate] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Title is required");
    onCreate({
      title: title.trim(),
      assignedTo: assignedTo.trim(),
      status,
      project,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    });
    setTitle(""); setAssignedTo(""); setStatus("pending"); setProject("general"); setDueDate("");
  };

  return (
    <form onSubmit={submit} className="toolbar" style={{ flexWrap:"wrap" }}>
      <input placeholder="Title"      value={title} onChange={e=>setTitle(e.target.value)} />
      <input placeholder="Assigned To" value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} />
      <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
      <select value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
      </select>
      <input placeholder="Project" value={project} onChange={e=>setProject(e.target.value)} />
      <button className="btn primary" disabled={loading} type="submit">{loading ? "Saving..." : "Create Task"}</button>
    </form>
  );
}
