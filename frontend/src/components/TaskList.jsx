export default function TaskList({ tasks, onToggleStatus, onDelete }) {
  if (!tasks?.length) return <p className="muted">No tasks yet.</p>;

  return (
    <ul className="list">
      {tasks.map(t => (
        <li key={t.id} className="row">
          <div>
            <div><b>{t.title}</b></div>
            <div className="muted">#{t.project} • {t.assignedTo || "-"}</div>
          </div>
          <div>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}</div>
          <div><span className={`badge ${t.status === "completed" ? "done" : "pending"}`}>{t.status}</span></div>
          <div className="muted">{new Date(t.updatedAt || t.createdAt).toLocaleString()}</div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn" onClick={()=>onToggleStatus(t)}>
              {t.status === "completed" ? "Mark Pending" : "Mark Done"}
            </button>
            <button className="btn" onClick={()=>onDelete(t)}>Delete</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
