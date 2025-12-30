/**
 * Backend API Client for Fact Capture AI
 *
 * Client API unifié pour toutes les communications avec le backend Hono.
 * 
 * REFACTORISÉ: Les types sont maintenant dans des fichiers séparés (./types/)
 * Les méthodes sont organisées par section mais restent dans cette classe
 * pour maintenir la compatibilité avec les imports existants.
 */

import { config } from "../config";

// ===== IMPORT DES TYPES DEPUIS LES FICHIERS SÉPARÉS =====
export * from "./types";

import type {
  ApiResponse,
  InvoiceAIResult,
  ChatContext,
  // Accounting
  AccountingEntry,
  AccountingResult,
  StatutPaiement,
  SaveResult,
  // Journals
  JournalCode,
  JournalConfig,
  JournalSummary,
  JournalEntryRecord,
  RegenerateAdditionalInfo,
  RegeneratedEntry,
  RegenerateResult,
  // Grand Livre
  GrandLivreAccount,
  GrandLivreDetail,
  GrandLivreEntry,
  Balance,
  // Lettrage
  LigneLettrable,
  GroupeLettrage,
  PropositionLettrage,
  LettrageResult,
  LettrageStats,
  // États Financiers
  Bilan,
  CompteResultat,
  Indicateurs,
  // Audit
  AuditResult,
  AuditRapide,
} from "./types";

// Get backend URL from centralized config
const BACKEND_URL = config.backendUrl;

/**
 * API Client class
 * 
 * Cette classe regroupe toutes les méthodes d'API par domaine:
 * - Health: vérification de l'état du backend
 * - Analysis: analyse d'images et chat
 * - Invoices: CRUD sur les factures
 * - Accounting: génération et sauvegarde d'écritures
 * - Journals: gestion des journaux comptables
 * - Grand Livre: consultation du grand livre
 * - Lettrage: rapprochement des écritures
 * - États Financiers: bilan, compte de résultat, indicateurs
 * - Audit: audit comptable IA
 * - Sessions: synchronisation PWA
 * - Export: export des données
 */
class BackendApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  // ===========================================================================
  // MÉTHODE DE BASE
  // ===========================================================================

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

  // ===========================================================================
  // HEALTH - Vérification de l'état du backend
  // ===========================================================================

  async healthCheck(): Promise<boolean> {
    const response = await this.request<{ status: string }>("/api/health");
    return response.success && response.data?.status === "healthy";
  }

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

  // ===========================================================================
  // ANALYSIS - Analyse d'images et chat
  // ===========================================================================

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

  // ===========================================================================
  // INVOICES - CRUD sur les factures
  // ===========================================================================

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

  async updateInvoice(id: string, aiResult: InvoiceAIResult): Promise<boolean> {
    const response = await this.request(`/api/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ aiResult }),
    });

    return response.success;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const response = await this.request(`/api/invoices/${id}`, {
      method: "DELETE",
    });

    return response.success;
  }

  // ===========================================================================
  // ACCOUNTING - Génération et sauvegarde d'écritures comptables
  // ===========================================================================

  async generateAccountingEntry(
    invoiceData: Record<string, unknown>,
    statutPaiement?: StatutPaiement,
    montantPartiel?: number
  ): Promise<AccountingResult> {
    const response = await this.request<AccountingResult["data"]>("/api/accounting/generate", {
      method: "POST",
      body: JSON.stringify({ invoiceData, statutPaiement, montantPartiel }),
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error || { code: "UNKNOWN", message: "Erreur inconnue" },
      };
    }

    return { success: true, data: response.data };
  }

  async refineAccountingEntry(
    previousEntry: AccountingEntry,
    userFeedback: string,
    originalInvoiceData: Record<string, unknown>
  ): Promise<AccountingResult> {
    const response = await this.request<AccountingResult["data"]>("/api/accounting/refine", {
      method: "POST",
      body: JSON.stringify({ previousEntry, userFeedback, originalInvoiceData }),
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error || { code: "UNKNOWN", message: "Erreur inconnue" },
      };
    }

    return { success: true, data: response.data };
  }

  async getPlanComptable(): Promise<Record<string, Array<{ numero: string; libelle: string }>>> {
    const response = await this.request<Record<string, Array<{ numero: string; libelle: string }>>>(
      "/api/accounting/plan-comptable"
    );
    return response.data || {};
  }

  async saveAccountingEntry(
    ecriture: AccountingEntry,
    options?: {
      invoiceId?: number;
      iaModel?: string;
      iaReasoning?: string;
      iaSuggestions?: string[];
    }
  ): Promise<SaveResult> {
    const response = await this.request<SaveResult["data"]>("/api/accounting/save", {
      method: "POST",
      body: JSON.stringify({
        ecriture,
        invoiceId: options?.invoiceId,
        iaModel: options?.iaModel,
        iaReasoning: options?.iaReasoning,
        iaSuggestions: options?.iaSuggestions,
      }),
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error || { code: "UNKNOWN", message: "Erreur inconnue" },
      };
    }

    return { success: true, data: response.data };
  }

  async getDuplicates(): Promise<unknown[]> {
    const response = await this.request<unknown[]>("/api/accounting/duplicates");
    return response.data || [];
  }

  async getTiers(type?: "fournisseur" | "client"): Promise<unknown[]> {
    const url = type ? `/api/accounting/tiers?type=${type}` : "/api/accounting/tiers";
    const response = await this.request<unknown[]>(url);
    return response.data || [];
  }

  async chatAboutEntry(
    message: string,
    entry: AccountingEntry
  ): Promise<{ success: boolean; reply?: string; error?: string }> {
    const response = await this.request<{ reply: string }>("/api/accounting/chat", {
      method: "POST",
      body: JSON.stringify({ message, entry }),
    });

    if (response.success && response.data) {
      return { success: true, reply: response.data.reply };
    }
    return { success: false, error: response.error?.message || "Erreur inconnue" };
  }

  // ===========================================================================
  // JOURNALS - Gestion des journaux comptables
  // ===========================================================================

  async getJournaux(): Promise<JournalConfig[]> {
    const response = await this.request<JournalConfig[]>("/api/journals");
    return response.data || [];
  }

  async getJournalStats(): Promise<{
    total_ecritures: number;
    total_debit: number;
    total_credit: number;
    par_journal: Record<JournalCode, { nb: number; debit: number; credit: number }>;
  }> {
    const response = await this.request<{
      total_ecritures: number;
      total_debit: number;
      total_credit: number;
      par_journal: Record<JournalCode, { nb: number; debit: number; credit: number }>;
    }>("/api/journals/stats");
    return response.data!;
  }

  async getJournalSummary(periode?: string): Promise<JournalSummary[]> {
    const url = periode && periode !== "all"
      ? `/api/journals/summary?periode=${periode}`
      : "/api/journals/summary";
    const response = await this.request<JournalSummary[]>(url);
    return response.data || [];
  }

  async getJournalEntries(
    journalCode: JournalCode,
    options?: {
      dateDebut?: string;
      dateFin?: string;
      statut?: string;
      limit?: number;
    }
  ): Promise<{ journal_code: JournalCode; ecritures: JournalEntryRecord[]; count: number }> {
    const params = new URLSearchParams();
    if (options?.dateDebut) params.set("date_debut", options.dateDebut);
    if (options?.dateFin) params.set("date_fin", options.dateFin);
    if (options?.statut) params.set("statut", options.statut);
    if (options?.limit) params.set("limit", options.limit.toString());

    const response = await this.request<{
      journal_code: JournalCode;
      ecritures: JournalEntryRecord[];
      count: number;
    }>(`/api/journals/${journalCode}?${params}`);
    return response.data!;
  }

  async getNextPieceNumber(
    journalCode: JournalCode,
    datePiece?: string
  ): Promise<{ numero_piece: string; journal_code: JournalCode; date_piece: string }> {
    const response = await this.request<{
      numero_piece: string;
      journal_code: JournalCode;
      date_piece: string;
    }>("/api/journals/next-piece", {
      method: "POST",
      body: JSON.stringify({ journal_code: journalCode, date_piece: datePiece }),
    });
    return response.data!;
  }

  async correctEntryJournal(
    entryId: string,
    newJournalCode: JournalCode,
    reason?: string
  ): Promise<{
    success: boolean;
    entry?: JournalEntryRecord;
    changes?: {
      old_journal: JournalCode;
      new_journal: JournalCode;
      updated_accounts: Array<{ old_account: string; new_account: string; reason: string }>;
    };
    error?: string;
  }> {
    const response = await this.request<{
      entry: JournalEntryRecord;
      changes: {
        old_journal: JournalCode;
        new_journal: JournalCode;
        updated_accounts: Array<{ old_account: string; new_account: string; reason: string }>;
      };
    }>("/api/journals/correct-journal", {
      method: "POST",
      body: JSON.stringify({
        entry_id: entryId,
        new_journal_code: newJournalCode,
        reason: reason || "Correction manuelle du journal",
      }),
    });

    if (!response.success) {
      return { success: false, error: response.error?.message };
    }
    return { success: true, entry: response.data?.entry, changes: response.data?.changes };
  }

  async regenerateEntryWithAI(
    entryId: string,
    targetJournal: JournalCode,
    additionalInfo: RegenerateAdditionalInfo
  ): Promise<{ success: boolean; data?: RegenerateResult; error?: string }> {
    const response = await this.request<RegenerateResult>("/api/journals/regenerate-entry", {
      method: "POST",
      body: JSON.stringify({
        entry_id: entryId,
        target_journal: targetJournal,
        additional_info: additionalInfo,
      }),
    });

    if (!response.success) {
      return { success: false, error: response.error?.message };
    }
    return { success: true, data: response.data };
  }

  async saveRegeneratedEntry(
    oldEntryId: string,
    newEntry: RegeneratedEntry
  ): Promise<{ success: boolean; data?: { new_entry_id: string; message: string }; error?: string }> {
    const response = await this.request<{ new_entry_id: string; message: string }>(
      "/api/journals/save-regenerated",
      {
        method: "POST",
        body: JSON.stringify({ old_entry_id: oldEntryId, new_entry: newEntry }),
      }
    );

    if (!response.success) {
      return { success: false, error: response.error?.message };
    }
    return { success: true, data: response.data };
  }

  // ===========================================================================
  // GRAND LIVRE - Consultation du grand livre
  // ===========================================================================

  async getComptesWithSoldes(options?: {
    classeDebut?: string;
    classeFin?: string;
    avecMouvements?: boolean;
  }): Promise<GrandLivreAccount[]> {
    const params = new URLSearchParams();
    if (options?.classeDebut) params.set("classe_debut", options.classeDebut);
    if (options?.classeFin) params.set("classe_fin", options.classeFin);
    if (options?.avecMouvements) params.set("avec_mouvements", "true");

    const response = await this.request<GrandLivreAccount[]>(
      `/api/grand-livre/comptes?${params}`
    );
    return response.data || [];
  }

  async getGrandLivreCompte(
    numeroCompte: string,
    options?: {
      dateDebut?: string;
      dateFin?: string;
      inclureLettres?: boolean;
    }
  ): Promise<GrandLivreDetail | null> {
    const params = new URLSearchParams();
    if (options?.dateDebut) params.set("date_debut", options.dateDebut);
    if (options?.dateFin) params.set("date_fin", options.dateFin);
    if (options?.inclureLettres) params.set("inclure_lettres", "true");

    const response = await this.request<GrandLivreDetail>(
      `/api/grand-livre/compte/${numeroCompte}?${params}`
    );
    return response.success ? response.data || null : null;
  }

  async getBalance(options?: {
    dateArrete?: string;
    classeDebut?: string;
    classeFin?: string;
  }): Promise<Balance> {
    const params = new URLSearchParams();
    if (options?.dateArrete) params.set("date_arrete", options.dateArrete);
    if (options?.classeDebut) params.set("classe_debut", options.classeDebut);
    if (options?.classeFin) params.set("classe_fin", options.classeFin);

    const response = await this.request<Balance>(`/api/grand-livre/balance?${params}`);
    return response.data!;
  }

  async searchComptes(
    query: string,
    limit?: number
  ): Promise<Array<{ numero_compte: string; libelle: string }>> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.set("limit", limit.toString());

    const response = await this.request<Array<{ numero_compte: string; libelle: string }>>(
      `/api/grand-livre/search-comptes?${params}`
    );
    return response.data || [];
  }

  async searchGrandLivre(filter: {
    compte_debut?: string;
    compte_fin?: string;
    date_debut?: string;
    date_fin?: string;
    journal_code?: string;
    tiers_code?: string;
    inclure_lettres?: boolean;
  }): Promise<GrandLivreEntry[]> {
    const response = await this.request<GrandLivreEntry[]>("/api/grand-livre/search", {
      method: "POST",
      body: JSON.stringify(filter),
    });
    return response.data || [];
  }

  // ===========================================================================
  // LETTRAGE - Rapprochement des écritures
  // ===========================================================================

  async getLignesALettrer(filter?: {
    compte_debut?: string;
    compte_fin?: string;
    tiers_code?: string;
    date_debut?: string;
    date_fin?: string;
    statut?: "non_lettre" | "partiellement_lettre" | "lettre";
    journal_code?: string;
  }): Promise<LigneLettrable[]> {
    const params = new URLSearchParams();
    if (filter?.compte_debut) params.set("compte_debut", filter.compte_debut);
    if (filter?.compte_fin) params.set("compte_fin", filter.compte_fin);
    if (filter?.tiers_code) params.set("tiers_code", filter.tiers_code);
    if (filter?.date_debut) params.set("date_debut", filter.date_debut);
    if (filter?.date_fin) params.set("date_fin", filter.date_fin);
    if (filter?.statut) params.set("statut", filter.statut);
    if (filter?.journal_code) params.set("journal_code", filter.journal_code);

    const response = await this.request<LigneLettrable[]>(`/api/lettrage/lignes?${params}`);
    return response.data || [];
  }

  async getGroupesLettrage(compte?: string): Promise<GroupeLettrage[]> {
    const url = compte
      ? `/api/lettrage/groupes?compte=${compte}`
      : "/api/lettrage/groupes";
    const response = await this.request<GroupeLettrage[]>(url);
    return response.data || [];
  }

  async getPropositionsLettrage(compte: string, tiersCode?: string): Promise<PropositionLettrage[]> {
    const url = tiersCode
      ? `/api/lettrage/propositions/${compte}?tiers_code=${tiersCode}`
      : `/api/lettrage/propositions/${compte}`;
    const response = await this.request<PropositionLettrage[]>(url);
    return response.data || [];
  }

  async getStatistiquesLettrage(compte: string): Promise<LettrageStats> {
    const response = await this.request<LettrageStats>(`/api/lettrage/statistiques/${compte}`);
    return response.data!;
  }

  async effectuerLettrage(
    ligneIds: number[],
    compte: string,
    tiersCode?: string
  ): Promise<LettrageResult> {
    const response = await this.request<{ lettre: string; lignes_lettrees: number[] }>(
      "/api/lettrage/effectuer",
      {
        method: "POST",
        body: JSON.stringify({ ligne_ids: ligneIds, compte, tiers_code: tiersCode }),
      }
    );

    if (!response.success) {
      return {
        success: false,
        error: response.error?.message || "Erreur de lettrage",
        ecart: (response.error?.details as { ecart?: number })?.ecart,
      };
    }

    return {
      success: true,
      lettre: response.data?.lettre,
      lignes_lettrees: response.data?.lignes_lettrees,
    };
  }

  async annulerLettrage(lettre: string, compte: string): Promise<boolean> {
    const response = await this.request("/api/lettrage/annuler", {
      method: "POST",
      body: JSON.stringify({ lettre, compte }),
    });
    return response.success;
  }

  async lettrageAuto(
    compte: string,
    options?: { tiersCode?: string; confianceMin?: number }
  ): Promise<{ nb_propositions: number; nb_lettres: number; nb_echecs: number }> {
    const response = await this.request<{
      nb_propositions: number;
      nb_lettres: number;
      nb_echecs: number;
    }>("/api/lettrage/auto", {
      method: "POST",
      body: JSON.stringify({
        compte,
        tiers_code: options?.tiersCode,
        confiance_min: options?.confianceMin || 90,
      }),
    });
    return response.data!;
  }

  // ===========================================================================
  // ÉTATS FINANCIERS - Bilan, compte de résultat, indicateurs
  // ===========================================================================

  async getBilan(exercice: string): Promise<Bilan | null> {
    try {
      const url = `${this.baseUrl}/api/etats-financiers/bilan?exercice=${exercice}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.error("[API] Erreur bilan:", response.status);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error("[API] Erreur récupération bilan:", error);
      return null;
    }
  }

  async getCompteResultat(exercice: string): Promise<CompteResultat | null> {
    try {
      const url = `${this.baseUrl}/api/etats-financiers/resultat?exercice=${exercice}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.error("[API] Erreur compte de résultat:", response.status);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error("[API] Erreur récupération compte de résultat:", error);
      return null;
    }
  }

  async getIndicateursFinanciers(exercice: string): Promise<Indicateurs | null> {
    try {
      const url = `${this.baseUrl}/api/etats-financiers/indicateurs?exercice=${exercice}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.error("[API] Erreur indicateurs:", response.status);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error("[API] Erreur récupération indicateurs:", error);
      return null;
    }
  }

  // ===========================================================================
  // AUDIT - Audit comptable IA
  // ===========================================================================

  async auditEtatsFinanciers(exercice: string): Promise<AuditResult> {
    const response = await this.request<AuditResult>(
      `/api/audit/etats-financiers?exercice=${exercice}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Erreur d'audit");
    }
    return response.data;
  }

  async auditRapide(exercice: string): Promise<AuditRapide> {
    const response = await this.request<AuditRapide>(
      `/api/audit/rapide?exercice=${exercice}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Erreur d'audit rapide");
    }
    return response.data;
  }

  async auditEcriture(facture: object, ecriture: object): Promise<AuditResult> {
    const response = await this.request<AuditResult>("/api/audit/ecriture", {
      method: "POST",
      body: JSON.stringify({ facture, ecriture }),
    });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Erreur d'audit écriture");
    }
    return response.data;
  }

  // ===========================================================================
  // SESSIONS - Synchronisation PWA
  // ===========================================================================

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

  // ===========================================================================
  // EXPORT - Export des données
  // ===========================================================================

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

// ===========================================================================
// ALIASES pour compatibilité avec les anciens imports
// ===========================================================================

// Alias pour JournalEntry (accounting-api utilisait ce nom)
export type JournalEntry = AccountingEntry;

// Fonction aliases pour compatibilité directe (sans passer par backendApi)
export const generateAccountingEntry = (
  invoiceData: Record<string, unknown>,
  statutPaiement?: StatutPaiement,
  montantPartiel?: number
) => backendApi.generateAccountingEntry(invoiceData, statutPaiement, montantPartiel);

export const refineAccountingEntry = (
  previousEntry: AccountingEntry,
  userFeedback: string,
  originalInvoiceData: Record<string, unknown>
) => backendApi.refineAccountingEntry(previousEntry, userFeedback, originalInvoiceData);

export const getPlanComptable = () => backendApi.getPlanComptable();

export const saveAccountingEntry = (
  ecriture: AccountingEntry,
  options?: { invoiceId?: number; iaModel?: string; iaReasoning?: string; iaSuggestions?: string[] }
) => backendApi.saveAccountingEntry(ecriture, options);

export const getDuplicates = () => backendApi.getDuplicates();
export const getTiers = (type?: "fournisseur" | "client") => backendApi.getTiers(type);
export const chatAboutEntry = (message: string, entry: AccountingEntry) =>
  backendApi.chatAboutEntry(message, entry);

// Journals
export const getJournaux = () => backendApi.getJournaux();
export const getJournalStats = () => backendApi.getJournalStats();
export const getJournalSummary = (periode?: string) => backendApi.getJournalSummary(periode);
export const getJournalEntries = (
  journalCode: JournalCode,
  options?: { dateDebut?: string; dateFin?: string; statut?: string; limit?: number }
) => backendApi.getJournalEntries(journalCode, options);
export const getNextPieceNumber = (journalCode: JournalCode, datePiece?: string) =>
  backendApi.getNextPieceNumber(journalCode, datePiece);
export const correctEntryJournal = (entryId: string, newJournalCode: JournalCode, reason?: string) =>
  backendApi.correctEntryJournal(entryId, newJournalCode, reason);
export const regenerateEntryWithAI = (
  entryId: string,
  targetJournal: JournalCode,
  additionalInfo: RegenerateAdditionalInfo
) => backendApi.regenerateEntryWithAI(entryId, targetJournal, additionalInfo);
export const saveRegeneratedEntry = (oldEntryId: string, newEntry: RegeneratedEntry) =>
  backendApi.saveRegeneratedEntry(oldEntryId, newEntry);

// Grand Livre
export const getComptesWithSoldes = (options?: {
  classeDebut?: string;
  classeFin?: string;
  avecMouvements?: boolean;
}) => backendApi.getComptesWithSoldes(options);
export const getGrandLivreCompte = (
  numeroCompte: string,
  options?: { dateDebut?: string; dateFin?: string; inclureLettres?: boolean }
) => backendApi.getGrandLivreCompte(numeroCompte, options);
export const getBalance = (options?: {
  dateArrete?: string;
  classeDebut?: string;
  classeFin?: string;
}) => backendApi.getBalance(options);
export const searchComptes = (query: string, limit?: number) => backendApi.searchComptes(query, limit);
export const searchGrandLivre = (filter: {
  compte_debut?: string;
  compte_fin?: string;
  date_debut?: string;
  date_fin?: string;
  journal_code?: string;
  tiers_code?: string;
  inclure_lettres?: boolean;
}) => backendApi.searchGrandLivre(filter);

// Lettrage
export const getLignesALettrer = (filter?: {
  compte_debut?: string;
  compte_fin?: string;
  tiers_code?: string;
  date_debut?: string;
  date_fin?: string;
  statut?: "non_lettre" | "partiellement_lettre" | "lettre";
  journal_code?: string;
}) => backendApi.getLignesALettrer(filter);
export const getGroupesLettrage = (compte?: string) => backendApi.getGroupesLettrage(compte);
export const getPropositionsLettrage = (compte: string, tiersCode?: string) =>
  backendApi.getPropositionsLettrage(compte, tiersCode);
export const getStatistiquesLettrage = (compte: string) => backendApi.getStatistiquesLettrage(compte);
export const effectuerLettrage = (ligneIds: number[], compte: string, tiersCode?: string) =>
  backendApi.effectuerLettrage(ligneIds, compte, tiersCode);
export const annulerLettrage = (lettre: string, compte: string) =>
  backendApi.annulerLettrage(lettre, compte);
export const lettrageAuto = (compte: string, options?: { tiersCode?: string; confianceMin?: number }) =>
  backendApi.lettrageAuto(compte, options);

// États Financiers
export const getBilan = (exercice: string) => backendApi.getBilan(exercice);
export const getCompteResultat = (exercice: string) => backendApi.getCompteResultat(exercice);
export const getIndicateursFinanciers = (exercice: string) => backendApi.getIndicateursFinanciers(exercice);

// Audit
export const auditEtatsFinanciers = (exercice: string) => backendApi.auditEtatsFinanciers(exercice);
export const auditRapide = (exercice: string) => backendApi.auditRapide(exercice);
export const auditEcriture = (facture: object, ecriture: object) =>
  backendApi.auditEcriture(facture, ecriture);
