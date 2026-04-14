import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';
import { PDAProvider } from './context/PDAContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PDAProvider>
      <App />
    </PDAProvider>
  </React.StrictMode>
);
