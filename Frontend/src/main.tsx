import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

const root = createRoot(rootElement);

import("./App.tsx")
  .then(({ default: App }) => {
    root.render(<App />);
  })
  .catch((error) => {
    console.error("Application bootstrap failed", error);

    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}\n\n${error.stack ?? ""}`
        : String(error);

    root.render(
      <div style={{ padding: "24px", fontFamily: "Arial, sans-serif", color: "#b91c1c" }}>
        <h1 style={{ fontSize: "20px", marginBottom: "12px" }}>Application bootstrap failed</h1>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "13px" }}>{message}</pre>
      </div>
    );
  });
