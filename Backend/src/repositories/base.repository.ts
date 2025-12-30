/**
 * Base Repository
 *
 * Classe de base pour tous les repositories avec accès au client Supabase
 */

import { getSupabase } from "../lib/supabase.js";
import type { SupabaseClient } from "@supabase/supabase-js";

export abstract class BaseRepository {
  /**
   * Accès protégé au client Supabase
   */
  protected get db(): SupabaseClient {
    return getSupabase();
  }
}

/**
 * Type générique pour les résultats paginés
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Options de pagination
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}
