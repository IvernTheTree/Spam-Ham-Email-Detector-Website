import { useState, useRef } from "react";
import { api, toError } from "../api/client";
import {
  Stack, TextField, Button, Alert, Chip, Paper, Typography, CircularProgress,
  Snackbar, IconButton, Divider, Tooltip, Box
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ProbabilityDoughnut from "../components/ProbabilityDoughnut";

export default function Predict(){
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [res, setRes] = useState(null);
  const textRef = useRef(null);

  const charCount = text.length;
  const tooLong = charCount > 5000;
  const canSubmit = text.trim().length > 0 && !tooLong && !loading;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setErr(""); setRes(null); setLoading(true);
    try {
      const r = await api.post("/predict/spam", { subject: null, text });
      const data = r.data;
      const requestId = r.headers?.["x-request-id"] || data?.id;
      setRes({ ...data, request_id: requestId, input: text });
    } catch (e2) {
      setErr(toError(e2));
      setToastOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const copyJSON = () => {
    if (!res) return;
    const payload = JSON.stringify(res, null, 2);
    navigator.clipboard.writeText(payload).then(()=>{
      setErr("Copied result JSON to clipboard."); setToastOpen(true);
    });
  };

  const clearAll = () => { setText(""); setRes(null); setErr(""); };

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canSubmit) handleSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            mt: { xs: 2, sm: 4 },
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)"
          }}
        >
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ color: "text.secondary" }}>
              Paste Email below:
            </Typography>

            <TextField
              placeholder="Paste the full raw email source here... (including headers)"
              value={text}
              onChange={(e)=>setText(e.target.value)}
              inputRef={textRef}
              onKeyDown={onKeyDown}
              multiline minRows={10}
              helperText={`${charCount}/5000`}
              error={tooLong || (text.trim().length===0 && !loading)}
              inputProps={{ maxLength: 5100, "aria-label": "Raw email text" }}
              sx={{ "& .MuiOutlinedInput-root": { bgcolor: "rgba(255,255,255,0.02)", borderRadius: 2 } }}
            />

            {err && <Alert severity="error">{err}</Alert>}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button type="submit" variant="contained" color="info" disabled={!canSubmit}>
                {loading ? <CircularProgress size={20} color="inherit" /> : "Detect Spam"}
              </Button>
              <Button variant="contained" color="warning" onClick={clearAll}>
                Clear All
              </Button>
            </Stack>

            {res && (
              <Box
                sx={{
                  mt: 2, p: 2, borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)"
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip
                      label={res.label?.toUpperCase() ?? "—"}
                      color={res.label==="spam" ? "error" : "success"}
                    />
                    <Typography variant="body2">
                      Probability {(res.probability*100).toFixed(1)}% · {res.elapsed_ms} ms · ReqID: {res.request_id}
                    </Typography>
                  </Stack>
                  <Tooltip title="Copy JSON">
                    <IconButton onClick={copyJSON} aria-label="Copy result JSON">
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Divider sx={{ my:2 }} />
                <ProbabilityDoughnut p={res.probability}/>
              </Box>
            )}
          </Stack>
        </Paper>

        <Snackbar
          open={toastOpen}
          autoHideDuration={2500}
          onClose={() => setToastOpen(false)}
          message={err || "Done"}
          action={
            <IconButton size="small" aria-label="close" color="inherit" onClick={() => setToastOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        />
      </Stack>
    </form>
  );
}
