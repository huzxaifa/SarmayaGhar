import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure refreshed page starts at the top
if (typeof window !== "undefined") {
  try {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  } catch (_) {
    // ignore
  }
}

createRoot(document.getElementById("root")!).render(<App />);
