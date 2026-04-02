import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Validate required environment variables
const validateEnv = () => {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
  for (const key of required) {
    if (!import.meta.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
};

validateEnv();

createRoot(document.getElementById("root")!).render(<App />);
