import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const rootEl = document.getElementById('root');

const render = () => {
  if (!rootEl) return;
  const root = createRoot(rootEl);
  root.render(<App />);
};

if (typeof Office !== 'undefined' && Office.onReady) {
  Office.onReady().then(render);
} else {
  render();
}
