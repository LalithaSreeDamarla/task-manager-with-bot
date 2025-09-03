// src/components/TaskList.jsx
import { useState } from "react";

export default function TaskList({ tasks, onToggleStatus, onDelete }) {
  if (!tasks?.length) return <p className="muted">No tasks yet.</p>;

  const [openId, setOpenId] = useState(null);

  const normalize = (s) => (s === "completed" ? "done" : s); // handle old data

  const fmtDate = (v) => {
    if (!v) return "-";
    const d = typeof v === "number" ? new Date(v) : new Date(String(v));
    return isNaN(d) ? "-" : d.toLocaleDateString();
  };

  const fmtDateTime = (v) => {
    if (!v) return "-";
    const d = typeof v === "number" ? new Date(v) : new Date(String(v));
    return isNaN(d) ? "-" : d.toLocaleString();
  };

  return (
    <ul className="list">
      {tasks.map((t) => {
        const isDone = normalize(t.status) === "done";
        const nextStatus = isDone ? "pending" : "done";
        const chipText = isDone ? "done" : "pending";
        const stepCount = t?.plan?.steps?.length || 0;

        return (
          <li key={t.id} className="row" style={{ flexDirection: "column", gap: 8 }}>
            {/* Top row */}
            <div className="row" style={{ width: "100%", alignItems: "center" }}>
              <div>
                <div><b>{t.title}</b></div>
                <div className="muted">#{t.project} • {t.assignedTo || "-"}</div>
              </div>

              <div>{fmtDate(t.dueDate)}</div>

              <div>
                <span className={`badge ${isDone ? "done" : "pending"}`}>
                  {chipText}
                </span>
              </div>

              <div className="muted">{fmtDateTime(t.updatedAt || t.createdAt)}</div>

              <div style={{ display: "flex", gap: 8 }}>
                {stepCount > 0 && (
                  <button
                    className="btn"
                    onClick={() => setOpenId(openId === t.id ? null : t.id)}
                  >
                    {openId === t.id ? "Hide Steps" : `Show Steps (${stepCount})`}
                  </button>
                )}
                <button className="btn" onClick={() => onToggleStatus(t, nextStatus)}>
                  {isDone ? "Mark Pending" : "Mark Done"}
                </button>
                <button className="btn" onClick={() => onDelete(t.id)}>Delete</button>
              </div>
            </div>

            {/* Plan panel */}
            {openId === t.id && stepCount > 0 && (
              <div
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 10,
                  background: "#f8fafc",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                {t.plan.summary ? (
                  <div style={{ marginBottom: 6 }}>
                    <b>Plan:</b> {t.plan.summary}
                  </div>
                ) : null}
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  {t.plan.steps.map((s, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <b>{s.title}</b>
                      {s.detail ? <div className="muted">{s.detail}</div> : null}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
