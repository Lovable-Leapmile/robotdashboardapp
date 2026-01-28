import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { migrateLocalStorageToCookies, areCookiesEnabled } from "./lib/encryptedCookieStorage";

// Run one-time migration from localStorage to encrypted cookies
if (areCookiesEnabled()) {
  migrateLocalStorageToCookies();
} else {
  console.warn("Cookies are disabled. Some features may not work properly.");
}

createRoot(document.getElementById("root")!).render(<App />);
