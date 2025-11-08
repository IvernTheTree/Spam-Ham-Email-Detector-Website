export function exportResultsCSV(results) {
  const header = ["Row", "Text", "Label", "Probability", "Elapsed_ms", "Error"];
  const lines = [header.join(",")];
  results.forEach(r => {
    lines.push([
      r.row,
      JSON.stringify(r.text), // quote if contains commas
      r.label ?? "",
      r.probability ?? "",
      r.elapsed_ms ?? "",
      r.error ?? "",
    ].join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `results_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}