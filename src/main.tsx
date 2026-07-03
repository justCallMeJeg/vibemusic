import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/error-boundary";

const MiniPlayerApp = lazy(() => import("./components/miniplayer-app"));

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

const params = new URLSearchParams(window.location.search);
const isMiniplayerMode = params.get("mode") === "miniplayer";

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      {isMiniplayerMode ? <Suspense fallback={null}><MiniPlayerApp /></Suspense> : <App />}
    </ErrorBoundary>
  </StrictMode>,
);
