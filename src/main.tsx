import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import keycloak from "./keycloak";

keycloak.init({ onLoad: 'check-sso', pkceMethod: 'S256', checkLoginIframe: false }).then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
