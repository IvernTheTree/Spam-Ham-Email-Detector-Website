import React, { useState } from "react";
import Papa from "papaparse";
import api from "./axios";
import CsvPreview from "./CsvPreview";  
import ResultsTable from "./ResultsTable";
import { exportResultsCSV } from "./csvExports";

export default function Batch() {
  const [previewRows, setPreviewRows] = useState([]);
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [readyCount, setReadyCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const validateRow = (row) => {
    const text = (row?.text ?? "").toString();
    if (text.length === 0) return "Missing text";
    if (text.length > 5000) return "Text exceeds 5000 characters";
    return null;
  };

  const notify = (message) => {
    // If you added a global Snackbar via axios interceptor, dispatch here.
    // Otherwise fallback to alert.
    try {
      window.dispatchEvent(new CustomEvent("app:error", { detail: message }));
    } catch {
      alert(message);
    }
  };

  const handleFileUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.name.toLowerCase().endsWith(".csv")) {
      notify("Please select a .csv file");
      return;
    }

    Papa.parse(f, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (res) => {
        const fields = res.meta.fields || [];
        if (!fields.map((h) => h.toLowerCase()).includes("text")) {
          notify("CSV must contain a 'text' column (or 'subject' + 'text').");
          return;
        }

        const allRows = res.data || [];

        if (allRows.length > 500) {
          notify("CSV cannot exceed 500 rows.");
          return;
        }

        const first50 = allRows.slice(0, 50);
        const validCount = allRows.reduce((acc, r) => acc + (validateRow(r) ? 0 : 1), 0);

        setPreviewRows(first50);
        setFile(f);
        setReadyCount(validCount);
        setResults([]);
      },
      error: (err) => notify(err.message || "Failed to parse CSV"),
    });
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/predict/spam-batch", fd);
      setResults(res?.data?.results || []);
    } catch (e) {
      // Axios interceptor (if present) will handle showing the toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h2>Batch Prediction</h2>

      <div style={{ marginBottom: 12 }}>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          aria-label="Upload CSV file"
        />
      </div>

      {previewRows.length > 0 && (
        <>
          <p style={{ margin: "8px 0" }}>
            Ready to Submit: <strong>{readyCount}</strong> rows
          </p>

          <CsvPreview rows={previewRows} />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={readyCount === 0 || loading}
            style={{ marginTop: 12 }}
            aria-disabled={readyCount === 0 || loading}
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </>
      )}

      {results.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>Results</h3>
          <ResultsTable results={results} />
          <button
            type="button"
            onClick={() => exportResultsCSV(results)}
            style={{ marginTop: 12 }}
          >
            Export Results CSV
          </button>
        </>
      )}
    </div>
  );
}