import { app } from "./app.js";
import { config } from "./config/env.js";

const port = config.port;

console.log(`🚀 Fact Capture AI Backend starting...`);
console.log(`📍 Environment: ${config.nodeEnv}`);

// Use Bun's native server
export default {
  port,
  fetch: app.fetch,
}

console.log(`✅ Server running on http://localhost:${port}`);
console.log(`📚 API Documentation: http://localhost:${port}/api/health`);
