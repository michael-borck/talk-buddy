import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { installConsoleTap } from './services/diagnostics';

// Capture renderer errors/warnings from launch so the Settings → Diagnostics
// report includes what went wrong before the user opened the panel.
installConsoleTap();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);