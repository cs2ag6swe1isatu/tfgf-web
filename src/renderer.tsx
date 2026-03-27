import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import App from "./App";
import theme from "./ui/theme";
import './ui/fonts.css';
import "./index.css";


const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}