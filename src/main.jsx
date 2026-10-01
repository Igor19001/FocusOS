import React from "react";
import { createRoot } from "react-dom/client";
import DayQuest from "./DayQuest";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DayQuest />
  </React.StrictMode>
);
