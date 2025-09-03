import { useState, useRef, useEffect } from "react";
import { sendChat } from "../api";  // ← use shared helper (POST /chat with {prompt})

/**
 * Chatbot — grounded in your task data.
 * Sends { prompt, context } to POST /chat
 */
export default function Chatbot({ tasks = [] }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! Ask me anything about your tasks or projects." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

    /// Auto-scroll to bottom on new message
  useEffect(() => {
    const el = listRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);


  const send = async (e) => {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;

    // Optimistic UI
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setInput("");
    setLoading(true);

    try {
      // Condense tasks for context (keep payload small)
      const condensed = (tasks || [])
        .filter(Boolean)
        .slice(0, 50)
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assignedTo: t.assignedTo,
          project: t.project,
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null,
        }));

      // Call backend via helper → POST /chat with { prompt, context }
      const data = await sendChat(prompt, { context: condensed });

      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.reply || "(no reply)" },
      ]);
    } catch (err) {
      const msg = typeof err?.message === "string" ? err.message : String(err);
      setMessages((m) => [...m, { role: "assistant", text: `⚠️ ${msg}` }]);
      console.error("chat failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Chat Assistant</div>

      {/* Messages */}
      <div
        ref={listRef}
        style={{
          maxHeight: 250,
          overflowY: "auto",
          border: "1px solid #f1f5f9",
          borderRadius: 10,
          padding: 10,
          background: "#fafafa",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              margin: "6px 0",
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: m.role === "user" ? "#eef2ff" : "#ffffff",
                fontSize: 14,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <b style={{ fontSize: 12, opacity: 0.7 }}>{m.role === "user" ? "You" : "Bot"}</b>
              <div>{m.text}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ fontSize: 12, opacity: 0.7, padding: "6px 0" }}>Bot is typing…</div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          aria-label="chat-input"
          style={{ flex: 1, padding: 8, borderRadius: 10, border: "1px solid #e5e7eb" }}
        />
        <button
          disabled={loading || !input.trim()}
          className="btn primary"
          type="submit"
          style={{ padding: "8px 14px" }}
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
