/**
 * Configuration centralisée du Frontend
 *
 * Toutes les variables d'environnement et configurations
 * sont accessibles depuis ce fichier unique.
 */

/**
 * Configuration de l'application
 */
export const config = {
  /**
   * URL du backend API (Hono)
   */
  backendUrl: import.meta.env.VITE_BACKEND_URL || "http://localhost:3001",

  /**
   * Configuration Supabase
   */
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  },

  /**
   * Mode de l'application
   */
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const;

/**
 * Vérifie si Supabase est configuré
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(config.supabase.url && config.supabase.anonKey);
}

/**
 * Vérifie si l'environnement est valide pour la production
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.supabase.url) {
    errors.push("VITE_SUPABASE_URL is not configured");
  }

  if (!config.supabase.anonKey) {
    errors.push("VITE_SUPABASE_ANON_KEY is not configured");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
