/**
 * Accounting API Client
 * 
 * Méthodes pour la génération et sauvegarde d'écritures comptables
 */

import { BaseApiClient } from "./base-client";
import type { AccountingEntry, AccountingResult, StatutPaiement, SaveResult } from "../types";

export class AccountingClient extends BaseApiClient {

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
}
