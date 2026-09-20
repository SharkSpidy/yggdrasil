import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import UploadPage from "./pages/UploadPage";
import "./styles/theme.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

// One route besides the tree itself: /upload/<token>. Deliberately not
// pulling in a router for a single path — just a plain match against
// location.pathname. Your host needs to fall back unknown paths to
// index.html for this to work (Vercel does this by default for Vite
// projects; on Netlify add a `public/_redirects` file with `/*  /index.html  200`).
const uploadMatch = window.location.pathname.match(/^\/upload\/([A-Za-z0-9_-]+)\/?$/);

createRoot(container).render(
  <StrictMode>{uploadMatch ? <UploadPage token={uploadMatch[1]} /> : <App />}</StrictMode>
);
