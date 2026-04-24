import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import { Web3Provider } from "./Web3Provider";
import "./styles.css";

window.addEventListener('error', (event) => {
  const message = String(event?.message || '');
  if (message.includes("can't access property \"catch\"") || message.includes('WeakMap key undefined')) {
    console.warn('[FocusOS:web3] intercepted global error', message);
    event.preventDefault();
    return;
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  console.warn('[FocusOS:web3] intercepted unhandled rejection', event.reason);
  event.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </React.StrictMode>
);
