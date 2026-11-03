import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Immediate UI Scale restoration before initial render
try {
  const savedScale = localStorage.getItem("votex_ui_scale");
  if (savedScale && document.body) {
    const num = Math.min(130, Math.max(80, Number(savedScale)));
    (document.body.style as any).zoom = (num / 100).toString();
  }
} catch {
  // Ignore in SSR/headless environments
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
