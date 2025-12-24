/**
 * Environment configuration with validation
 */

interface Config {
  // OpenRouter
  openrouterApiKey: string;
  openrouterModel: string;
  openrouterBaseUrl: string;

  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;

  // Server
  port: number;
  nodeEnv: "development" | "production" | "test";
  corsOrigins: string[];
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvVarOptional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config: Config = {
  // OpenRouter
  openrouterApiKey: getEnvVar("OPENROUTER_API_KEY", ""),
  openrouterModel: getEnvVarOptional("OPENROUTER_MODEL", "qwen/qwen3-vl-32b-instruct"),
  openrouterBaseUrl: getEnvVarOptional("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),

  // Supabase
  supabaseUrl: getEnvVar("SUPABASE_URL", ""),
  supabaseAnonKey: getEnvVar("SUPABASE_ANON_KEY", ""),
  supabaseServiceRoleKey: getEnvVarOptional("SUPABASE_SERVICE_ROLE_KEY", ""),

  // Server
  port: parseInt(getEnvVarOptional("PORT", "3001"), 10),
  nodeEnv: getEnvVarOptional("NODE_ENV", "development") as Config["nodeEnv"],
  corsOrigins: getEnvVarOptional("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:8080,http://localhost:8081")
    .split(",")
    .map((origin) => origin.trim()),
};

/**
 * Validate that all required configurations are set
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.openrouterApiKey) {
    errors.push("OPENROUTER_API_KEY is required for AI analysis");
  }

  if (!config.supabaseUrl) {
    errors.push("SUPABASE_URL is required for database operations");
  }

  if (!config.supabaseAnonKey) {
    errors.push("SUPABASE_ANON_KEY is required for database operations");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if OpenRouter is configured
 */
export function isOpenRouterConfigured(): boolean {
  return Boolean(config.openrouterApiKey);
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}
