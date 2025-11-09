import { ThemeProvider } from "@mui/material/styles";
import theme from "./Theme";
import { CssBaseline, Container, Box } from "@mui/material";
import Predict from "./pages/Predict";
import HeroTitle from "./components/HeroTitle";

export default function App(){
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight:"100vh", bgcolor:"background.default" }}>
        <Container maxWidth="md">
          <HeroTitle />
          <Predict />
        </Container>
      </Box>
    </ThemeProvider>
  );
}
