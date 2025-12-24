/**
 * Backend API Client for Fact Capture AI
 * Handles all communication with the Hono backend
 */

// Get backend URL from environment or default to localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

/**
 * Invoice AI Result type (matches backend)
 */
export interface InvoiceAIResult {
  is_invoice: boolean;
  type_document?: string;
  type_facture?: string;
  fournisseur?: string;
  adresse_fournisseur?: string;
  telephone_fournisseur?: string;
  email_fournisseur?: string;
  client?: string;
  adresse_client?: string;
  numero_facture?: string;
  date_facture?: string;
  date_echeance?: string;
  articles: Array<{
    designation?: string;
    quantite?: string;
    unite?: string;
    prix_unitaire?: string;
    prix_unitaire_ht?: string;
    montant_ht?: string;
    taux_tva?: string;
    montant_tva?: string;
    montant_ttc?: string;
    total?: string; // Alias pour montant_ttc (compatibilité)
  }>;
  total_ht?: string;
  tva?: string;
  total_tva?: string;
  remise?: string;
  montant_total?: string;
  devise?: string;
  mode_paiement?: string;
  conditions_paiement?: string;
  numero_commande?: string;
  notes?: string;
  ai_comment?: string;
  extra_fields?: Record<string, string>;
  // Nouveaux champs comptables
  tva_details?: Array<{ taux: string; base_ht: string; montant_tva: string }>;
  donnees_manquantes?: string[];
  infos_complementaires?: Record<string, string>;
}

/**
 * Chat context for AI conversations
 */
export interface ChatContext {
  invoiceData: InvoiceAIResult;
  imageBase64: string | null;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * API Client class
 */
class BackendApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a request to the backend
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: "REQUEST_FAILED",
            message: `Request failed with status ${response.status}`,
          },
        };
      }

      return data;
    } catch (error) {
      console.error(`[API] Request to ${endpoint} failed:`, error);
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network request failed",
        },
      };
    }
  }

  // ===== Health Endpoints =====

  /**
   * Check if backend is healthy
   */
  async healthCheck(): Promise<boolean> {
    const response = await this.request<{ status: string }>("/api/health");
    return response.success && response.data?.status === "healthy";
  }

  /**
   * Check if backend is ready (all dependencies configured)
   */
  async readyCheck(): Promise<{
    ready: boolean;
    checks: {
      openrouter: { configured: boolean };
      supabase: { configured: boolean };
    };
  }> {
    const response = await this.request<{
      status: string;
      checks: {
        openrouter: { configured: boolean };
        supabase: { configured: boolean };
      };
    }>("/api/health/ready");

    return {
      ready: response.success && response.data?.status === "ready",
      checks: response.data?.checks || {
        openrouter: { configured: false },
        supabase: { configured: false },
      },
    };
  }

  // ===== Analysis Endpoints =====

  /**
   * Analyze an invoice image
   */
  async analyzeImage(imageBase64: string, isPdf: boolean = false): Promise<InvoiceAIResult | null> {
    const response = await this.request<InvoiceAIResult>("/api/analysis/image", {
      method: "POST",
      body: JSON.stringify({ imageBase64, isPdf }),
    });

    if (!response.success) {
      console.error("[API] Analysis failed:", response.error);
      return null;
    }

    return response.data || null;
  }

  /**
   * Analyze a PDF document (multiple pages)
   */
  async analyzePDF(pages: string[]): Promise<InvoiceAIResult | null> {
    const response = await this.request<InvoiceAIResult>("/api/analysis/pdf", {
      method: "POST",
      body: JSON.stringify({ pages }),
    });

    if (!response.success) {
      console.error("[API] PDF analysis failed:", response.error);
      return null;
    }

    return response.data || null;
  }

  /**
   * Chat with AI about an invoice
   */
  async chat(
    message: string,
    context: ChatContext,
    forceReanalyze: boolean = false
  ): Promise<{ response: string; updatedData: InvoiceAIResult | null }> {
    const response = await this.request<{
      response: string;
      updatedData: InvoiceAIResult | null;
    }>("/api/analysis/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        invoiceData: context.invoiceData,
        imageBase64: context.imageBase64,
        conversationHistory: context.conversationHistory,
        forceReanalyze,
      }),
    });

    if (!response.success || !response.data) {
      return {
        response: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        updatedData: null,
      };
    }

    return response.data;
  }

  // ===== Invoice Endpoints =====

  /**
   * Get all invoices
   */
  async getInvoices(limit: number = 50, offset: number = 0): Promise<{
    invoices: Array<{ id: string; created_at: string; ai_result: InvoiceAIResult | null }>;
    total: number;
  }> {
    const response = await this.request<
      Array<{ id: string; created_at: string; ai_result: InvoiceAIResult | null }>
    >(`/api/invoices?limit=${limit}&offset=${offset}`);

    return {
      invoices: response.data || [],
      total: (response.meta?.total as number) || 0,
    };
  }

  /**
   * Get latest invoice
   */
  async getLatestInvoice(): Promise<{
    id: string;
    image_base64: string;
    ai_result: InvoiceAIResult | null;
    created_at: string;
  } | null> {
    const response = await this.request<{
      id: string;
      image_base64: string;
      ai_result: InvoiceAIResult | null;
      created_at: string;
    }>("/api/invoices/latest");

    return response.data || null;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(id: string): Promise<{
    id: string;
    image_base64: string;
    ai_result: InvoiceAIResult | null;
    created_at: string;
  } | null> {
    const response = await this.request<{
      id: string;
      image_base64: string;
      ai_result: InvoiceAIResult | null;
      created_at: string;
    }>(`/api/invoices/${id}`);

    return response.data || null;
  }

  /**
   * Create a new invoice
   */
  async createInvoice(
    imageBase64: string,
    aiResult?: InvoiceAIResult,
    sessionId?: string
  ): Promise<{ id: string } | null> {
    const response = await this.request<{ id: string }>("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ imageBase64, aiResult, sessionId }),
    });

    return response.data || null;
  }

  /**
   * Update invoice AI result
   */
  async updateInvoice(id: string, aiResult: InvoiceAIResult): Promise<boolean> {
    const response = await this.request(`/api/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ aiResult }),
    });

    return response.success;
  }

  /**
   * Delete an invoice
   */
  async deleteInvoice(id: string): Promise<boolean> {
    const response = await this.request(`/api/invoices/${id}`, {
      method: "DELETE",
    });

    return response.success;
  }

  // ===== Session Endpoints =====

  /**
   * Create a capture session (for PWA sync)
   */
  async createSession(desktopId?: string, expiresInMinutes: number = 15): Promise<{
    id: string;
    desktop_id: string;
    status: string;
    expires_at: string;
  } | null> {
    const response = await this.request<{
      id: string;
      desktop_id: string;
      status: string;
      expires_at: string;
    }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ desktopId, expiresInMinutes }),
    });

    return response.data || null;
  }

  /**
   * Get session by ID
   */
  async getSession(id: string): Promise<{
    id: string;
    desktop_id: string;
    status: string;
    image_base64?: string;
    expires_at: string;
  } | null> {
    const response = await this.request<{
      id: string;
      desktop_id: string;
      status: string;
      image_base64?: string;
      expires_at: string;
    }>(`/api/sessions/${id}`);

    return response.data || null;
  }

  /**
   * Update session (e.g., when photo is captured)
   */
  async updateSession(
    id: string,
    updates: { status?: string; imageBase64?: string }
  ): Promise<boolean> {
    const response = await this.request(`/api/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

    return response.success;
  }

  // ===== Export Endpoints =====

  /**
   * Export invoices to various formats
   */
  async exportInvoices(
    invoices: InvoiceAIResult[],
    format: "csv" | "json" | "sage" = "csv",
    options?: {
      convertToFCFA?: boolean;
      includeArticles?: boolean;
    }
  ): Promise<{ content: string; filename: string; contentType: string } | null> {
    const response = await this.request<{
      content: string;
      filename: string;
      contentType: string;
    }>("/api/exports", {
      method: "POST",
      body: JSON.stringify({ invoices, format, options }),
    });

    return response.data || null;
  }
}

// Export singleton instance
export const backendApi = new BackendApiClient();

// Export class for custom instances
export { BackendApiClient };
