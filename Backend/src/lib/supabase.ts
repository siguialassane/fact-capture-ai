/**
 * Supabase Client
 * 
 * Client Supabase configuré pour le backend
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, isSupabaseConfigured } from "../config/env.js";

// Singleton Supabase client
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create the Supabase client instance
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured. Check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.");
    }
    supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }
  return supabaseInstance;
}

/**
 * Check if Supabase is available
 */
export function isSupabaseAvailable(): boolean {
  return isSupabaseConfigured();
}

/**
 * Re-export isSupabaseConfigured for convenience
 */
export { isSupabaseConfigured };
