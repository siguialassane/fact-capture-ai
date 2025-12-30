/**
 * Invoice Repository
 *
 * Gère toutes les opérations de base de données pour les factures
 */

import { BaseRepository, type PaginatedResult, type PaginationOptions } from "./base.repository.js";

/**
 * Type pour une facture
 */
export interface Invoice {
  id: number;
  image_path: string;
  image_url: string;
  image_base64?: string | null;
  ai_result?: Record<string, unknown> | null;
  timestamp?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Type pour la liste des factures (version légère)
 */
export interface InvoiceListItem {
  id: number;
  created_at: string;
  ai_result?: Record<string, unknown> | null;
  session_id?: string | null;
}

/**
 * DTO pour créer une facture
 */
export interface CreateInvoiceDto {
  imageBase64: string;
  aiResult?: Record<string, unknown> | null;
}

/**
 * DTO pour mettre à jour une facture
 */
export interface UpdateInvoiceDto {
  aiResult: Record<string, unknown>;
}

class InvoiceRepositoryClass extends BaseRepository {
  /**
   * Récupère toutes les factures avec pagination
   */
  async findAll(options: PaginationOptions = {}): Promise<PaginatedResult<InvoiceListItem>> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const { data, error, count } = await this.db
      .from("invoices")
      .select("id, created_at, ai_result, session_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[InvoiceRepository] findAll error:", error);
      throw new Error("Failed to fetch invoices");
    }

    return {
      data: data || [],
      meta: {
        total: count || 0,
        limit,
        offset,
      },
    };
  }

  /**
   * Récupère la dernière facture
   */
  async findLatest(): Promise<Invoice | null> {
    const { data, error } = await this.db
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[InvoiceRepository] findLatest error:", error);
      throw new Error("Failed to fetch latest invoice");
    }

    return data || null;
  }

  /**
   * Récupère une facture par son ID
   */
  async findById(id: string | number): Promise<Invoice | null> {
    const { data, error } = await this.db
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("[InvoiceRepository] findById error:", error);
      throw new Error("Failed to fetch invoice");
    }

    return data;
  }

  /**
   * Crée une nouvelle facture
   */
  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    const { data, error } = await this.db
      .from("invoices")
      .insert([
        {
          image_base64: dto.imageBase64,
          image_path: "",
          image_url: "",
          ai_result: dto.aiResult || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[InvoiceRepository] create error:", error);
      throw new Error("Failed to create invoice");
    }

    return data;
  }

  /**
   * Met à jour le résultat AI d'une facture
   */
  async update(id: string | number, dto: UpdateInvoiceDto): Promise<Invoice> {
    const { data, error } = await this.db
      .from("invoices")
      .update({ ai_result: dto.aiResult })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Invoice not found");
      }
      console.error("[InvoiceRepository] update error:", error);
      throw new Error("Failed to update invoice");
    }

    return data;
  }

  /**
   * Supprime une facture
   */
  async delete(id: string | number): Promise<void> {
    const { error } = await this.db.from("invoices").delete().eq("id", id);

    if (error) {
      console.error("[InvoiceRepository] delete error:", error);
      throw new Error("Failed to delete invoice");
    }
  }
}

// Export singleton
export const InvoiceRepository = new InvoiceRepositoryClass();
