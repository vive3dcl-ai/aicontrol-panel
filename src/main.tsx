import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ProveedorSesion } from "./sesion";
import { ThemeProvider } from "./tema";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ProveedorSesion>
          <App />
        </ProveedorSesion>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
