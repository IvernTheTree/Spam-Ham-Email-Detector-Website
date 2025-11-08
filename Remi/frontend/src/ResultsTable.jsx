import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import Tooltip from "@mui/material/Tooltip";

export default function ResultsTable({ results }) {
  const rows = results.map((r, i) => ({ id: i, ...r }));
  const columns = [
    { field: "row", headerName: "Row#", width: 80 },
    {
      field: "text", headerName: "Text", width: 300,
      renderCell: (params) => (
        <Tooltip title={params.value || ""}><span>{params.value}</span></Tooltip>
      ),
    },
    { field: "label", headerName: "Label", width: 100 },
    { field: "probability", headerName: "Probability", width: 130 },
    { field: "elapsed_ms", headerName: "Elapsed (ms)", width: 120 },
    { field: "error", headerName: "Error", width: 200 },
  ];
  return (
    <div style={{ height: 450 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSizeOptions={[10]}
        sx={{
          "& .MuiDataGrid-row:hover": { backgroundColor: "#f9f9f9" },
          "& .MuiDataGrid-columnHeaders": { position: "sticky", top: 0, background: "#fafafa" },
        }}
      />
    </div>
  );
}