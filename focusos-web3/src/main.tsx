import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import { Web3Provider } from "./Web3Provider";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </React.StrictMode>
);
