import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/app.css';
import App from './App';

// Prevent window.ethereum errors from MetaMask or other Ethereum wallets
if (typeof window.ethereum === 'undefined') {
  window.ethereum = null;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
