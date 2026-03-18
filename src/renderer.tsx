import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import App from './App';
import './index.css';
import Board from './components/Board';
import QuizCard from './components/QuizCard';
import { pixelTheme } from './themes/pixelArt';
import { lightTheme } from './themes/muiLight';
import { darkTheme } from './themes/muiDark';

const theme = darkTheme;

const root = createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
      <Board />
      <QuizCard />
    </ThemeProvider>
  </React.StrictMode>
);