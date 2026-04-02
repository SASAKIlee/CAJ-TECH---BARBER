import { StrictMode } from "react"; // 🚀 Importação necessária
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { injectSpeedInsights } from '@vercel/speed-insights';

// Inject Vercel Speed Insights
injectSpeedInsights();

// Envolvemos o <App /> com o <StrictMode>
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);