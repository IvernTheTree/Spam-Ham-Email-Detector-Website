import { Box, Typography } from "@mui/material";

export default function HeroTitle() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 6, mb: 4 }}>
      <Box
        sx={{
          px: 3, py: 1.5,
          borderRadius: 12,
          bgcolor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)"
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: 22, sm: 26, md: 30 },
            fontWeight: 800,
            letterSpacing: 0.2,
            lineHeight: 1.2,
            color: "text.primary" // base color for non-gradient text
          }}
        >
          {/* Gradient only on this word */}
          <Box
            component="span"
            sx={{
              display: "inline-block",
              background: "linear-gradient(90deg,#38bdf8,#60a5fa)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Email & Malware
          </Box>
          &nbsp;
          {/* Normal, visible text */}
          <Box component="span" sx={{ opacity: 0.95 }}>
            Detector
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}
