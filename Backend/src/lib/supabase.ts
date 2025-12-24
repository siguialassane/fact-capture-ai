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
 * Export the supabase client directly for convenience
 */
export const supabase = isSupabaseConfigured() 
  ? createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null as unknown as SupabaseClient;

/**
 * Check if Supabase is available
 */
export function isSupabaseAvailable(): boolean {
  return isSupabaseConfigured() && supabase !== null;
}
