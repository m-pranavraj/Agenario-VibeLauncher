import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent Replit watermark/badge from rendering dynamically
if (typeof window !== "undefined") {
  const removeReplitWatermarks = () => {
    const selectors = [
      "replit-viewer-badge",
      "#replit-badge-root",
      ".replit-badge",
      ".replit-watermark",
      "#replit-dev-banner",
      ".replit-dev-banner",
      'iframe[src*="replit"]',
      'iframe[id*="replit"]',
      'a[href*="replit.com"]'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.remove();
      });
    });

    // Also look for any elements that mention "Replit" or "made with replit"
    document.querySelectorAll("div, iframe, a").forEach(el => {
      const text = el.textContent || "";
      if (text.toLowerCase().includes("made with replit")) {
        el.remove();
      }
    });
  };

  removeReplitWatermarks();
  window.addEventListener("DOMContentLoaded", removeReplitWatermarks);
  window.addEventListener("load", removeReplitWatermarks);

  const observer = new MutationObserver(removeReplitWatermarks);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

createRoot(document.getElementById("root")!).render(<App />);
