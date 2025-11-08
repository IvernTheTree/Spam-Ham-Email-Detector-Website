import React from "react";
import { DataGrid } from "@mui/x-data-grid";

export default function CsvPreview({ rows }) {
  const dataRows = rows.map((r, i) => ({ id: i, ...r }));
  const cols = Object.keys(rows[0] || {}).map((key) => ({
    field: key, headerName: key, width: 250, sortable: false,
  }));
  return (
    <div style={{ height: 400 }}>
      <DataGrid
        rows={dataRows}
        columns={cols}
        pageSizeOptions={[10]}
        disableColumnMenu
        sx={{
          "& .MuiDataGrid-columnHeaders": { position: "sticky", top: 0, background: "#fafafa" },
        }}
      />
    </div>
  );
}