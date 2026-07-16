import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./styles.css";

// 빌드 타임 환경변수 우선, 런타임 fallback
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  (window as any).__VITE_GOOGLE_CLIENT_ID ||
  "712952977295-pojglju7q1o5lc8uggq2jgae7hnh0l4l.apps.googleusercontent.com";

// clientId가 있을 때만 렌더링
if (!GOOGLE_CLIENT_ID) {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <div style={{ padding: "20px", color: "red" }}>
      <h2>Configuration Error</h2>
      <p>VITE_GOOGLE_CLIENT_ID environment variable is not set.</p>
      <p>Please set it in Vercel project settings or .env file.</p>
    </div>,
  );
} else {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>,
  );
}
