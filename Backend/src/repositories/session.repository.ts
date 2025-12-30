/**
 * Session Repository
 *
 * Gère toutes les opérations de base de données pour les sessions de capture
 */

import { BaseRepository } from "./base.repository.js";

/**
 * Status possible d'une session
 */
export type SessionStatus = "waiting" | "ready" | "captured" | "cancelled";

/**
 * Type pour une session de capture
 */
export interface CaptureSession {
  id: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

/**
 * DTO pour créer une session
 */
export interface CreateSessionDto {
  desktopId?: string;
  expiresInMinutes?: number;
}

/**
 * DTO pour mettre à jour une session
 */
export interface UpdateSessionDto {
  status?: "pending" | "captured" | "completed" | "expired";
  imageBase64?: string;
}

class SessionRepositoryClass extends BaseRepository {
  /**
   * Récupère toutes les sessions, optionnellement filtrées par statut
   */
  async findAll(status?: string): Promise<CaptureSession[]> {
    let query = this.db
      .from("capture_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[SessionRepository] findAll error:", error);
      throw new Error("Failed to fetch sessions");
    }

    return data || [];
  }

  /**
   * Récupère une session par son ID
   */
  async findById(id: string): Promise<CaptureSession | null> {
    const { data, error } = await this.db
      .from("capture_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("[SessionRepository] findById error:", error);
      throw new Error("Failed to fetch session");
    }

    return data;
  }

  /**
   * Crée une nouvelle session
   */
  async create(_dto: CreateSessionDto): Promise<CaptureSession> {
    const { data, error } = await this.db
      .from("capture_sessions")
      .insert([
        {
          status: "waiting",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[SessionRepository] create error:", error);
      throw new Error("Failed to create session");
    }

    return data;
  }

  /**
   * Met à jour une session
   */
  async update(id: string, dto: UpdateSessionDto): Promise<CaptureSession> {
    const { data, error } = await this.db
      .from("capture_sessions")
      .update(dto)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Session not found");
      }
      console.error("[SessionRepository] update error:", error);
      throw new Error("Failed to update session");
    }

    return data;
  }

  /**
   * Supprime une session
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("capture_sessions").delete().eq("id", id);

    if (error) {
      console.error("[SessionRepository] delete error:", error);
      throw new Error("Failed to delete session");
    }
  }

  /**
   * Marque les sessions expirées comme "expired"
   */
  async expirePending(): Promise<number> {
    const { data, error } = await this.db
      .from("capture_sessions")
      .update({ status: "expired" })
      .lt("expires_at", new Date().toISOString())
      .eq("status", "pending")
      .select();

    if (error) {
      console.error("[SessionRepository] expirePending error:", error);
      throw new Error("Failed to cleanup sessions");
    }

    const expiredCount = data?.length || 0;
    console.log(`[SessionRepository] Cleaned up ${expiredCount} expired sessions`);

    return expiredCount;
  }
}

// Export singleton
export const SessionRepository = new SessionRepositoryClass();
