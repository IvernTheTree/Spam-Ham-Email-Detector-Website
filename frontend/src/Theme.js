// MUI dark theme tuned to your screenshot
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0b1324", // page
      paper: "#121b2f"    // card
    },
    text: { primary: "#e5e7eb", secondary: "#b6bfd6" },
    info:   { main: "#0891b2" }, // teal - Detect
    warning:{ main: "#f59e0b" }, // orange - Clear
  },
  shape: { borderRadius: 16 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.45)"
        }
      }
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" }
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 10 }
      }
    }
  },
  typography: {
    fontFamily: `"Inter", system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji"`,
  }
});

export default theme;
