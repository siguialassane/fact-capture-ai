/**
 * Accounting API Client
 * 
 * Méthodes pour la génération et sauvegarde d'écritures comptables
 */

import { BaseApiClient } from "./base-client";
import type { AccountingEntry, AccountingResult, StatutPaiement, SaveResult } from "../types";

export type AIModel = "google/gemini-2.5-flash" | "google/gemini-3-flash-preview";

export class AccountingClient extends BaseApiClient {

    /**
     * Récupère le modèle IA sélectionné depuis localStorage
     */
    private getSelectedModel(): AIModel {
        const stored = localStorage.getItem("exia-ai-model");
        return (stored as AIModel) || "google/gemini-2.5-flash";
    }

    async generateAccountingEntry(
        invoiceData: Record<string, unknown>,
        statutPaiement?: StatutPaiement,
        montantPartiel?: number,
        model?: AIModel
    ): Promise<AccountingResult> {
        const selectedModel = model || this.getSelectedModel();
        const response = await this.request<AccountingResult["data"]>("/api/accounting/generate", {
            method: "POST",
            body: JSON.stringify({ 
                invoiceData, 
                statutPaiement, 
                montantPartiel,
                model: selectedModel,
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

    async refineAccountingEntry(
        previousEntry: AccountingEntry,
        userFeedback: string,
        originalInvoiceData: Record<string, unknown>,
        model?: AIModel
    ): Promise<AccountingResult> {
        const selectedModel = model || this.getSelectedModel();
        const response = await this.request<AccountingResult["data"]>("/api/accounting/refine", {
            method: "POST",
            body: JSON.stringify({ 
                previousEntry, 
                userFeedback, 
                originalInvoiceData,
                model: selectedModel,
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

    async getEntriesByInvoice(invoiceId: string): Promise<unknown[]> {
        const response = await this.request<unknown[]>(`/api/accounting/entries?invoice_id=${invoiceId}`);
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
}
