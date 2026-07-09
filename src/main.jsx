import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App"; // Removimos la extensión .jsx que a veces da guerra

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);