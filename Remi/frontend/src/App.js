import { useState } from "react";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";

export default function App() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function checkHealth() {
    setError("");
    setHealth(null);
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setHealth(await res.json());
    } catch (e) {
      setError(`Health check failed: ${e.message}`);
    }
  }

  // Try batch endpoint first; if 404/405, fall back to single endpoint
  async function predict() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      // Batch: { texts: [...] }
      let res = await fetch(`${API_BASE}/predict/spam-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: [text] })
      });

      if (!res.ok) {
        // Fallback: { text: ... }
        res = await fetch(`${API_BASE}/predict/spam`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        });
      }

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(`Prediction failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Derive a probability from common response shapes
  const spamProb =
    typeof result?.probability === "number"
      ? result.probability
      : Array.isArray(result?.probs)
      ? result.probs[0]
      : null;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>Spam Predictor</h1>

      <div style={{ marginBottom: 12 }}>
        <button onClick={checkHealth}>Check Health</button>
        {health && (
          <code style={{ marginLeft: 12 }}>
            {JSON.stringify(health)}
          </code>
        )}
      </div>

      <label htmlFor="msg"><strong>Message</strong></label>
      <textarea
        id="msg"
        rows={4}
        style={{ width: "100%", display: "block", marginTop: 6 }}
        placeholder="Type a message to classify…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={predict} disabled={!text || loading}>
          {loading ? "Predicting…" : "Predict"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 16, color: "#c0392b" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 24 }}>
          <h3>Result</h3>
          <pre
            style={{
              background: "#f7f7f7",
              padding: 12,
              borderRadius: 6,
              overflowX: "auto"
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>

          {typeof spamProb === "number" && (
            <p>
              <strong>Spam probability:</strong>{" "}
              {(spamProb * 100).toFixed(1)}%
            </p>
          )}
        </div>
      )}
    </div>
  );
}
