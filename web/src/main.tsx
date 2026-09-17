import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadAppAccent } from "./lib/appAccent";
import "./index.css";

loadAppAccent();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
