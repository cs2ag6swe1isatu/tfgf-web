import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const App = () => {
  return (
    <div>
      <h1>Hello from React!</h1>
      <p>This is a React component in an Electron app.</p>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
