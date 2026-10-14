import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/app";
import "@/styles/globals.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error('Không tìm thấy phần tử gốc "#root" trong index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
