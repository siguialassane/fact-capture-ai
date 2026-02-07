/**
 * Invoices API Client
 * 
 * Méthodes CRUD pour les factures
 */

import { BaseApiClient } from "./base-client";
import type { InvoiceAIResult } from "../types";

export class InvoicesClient extends BaseApiClient {

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

    async getInvoicesWithEntries(limit: number = 50, offset: number = 0): Promise<{
        invoices: Array<{
            id: string;
            created_at: string;
            ai_result: InvoiceAIResult | null;
            journal_entries?: Array<{
                id: string;
                journal_code: string;
                statut: string;
                total_debit: number;
                total_credit: number;
                created_at: string;
            }> | null;
        }>;
        total: number;
    }> {
        const response = await this.request<
            Array<{
                id: string;
                created_at: string;
                ai_result: InvoiceAIResult | null;
                journal_entries?: Array<{
                    id: string;
                    journal_code: string;
                    statut: string;
                    total_debit: number;
                    total_credit: number;
                    created_at: string;
                }> | null;
            }>
        >(`/api/invoices/with-entries?limit=${limit}&offset=${offset}`);

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

    async clearTestInvoices(): Promise<boolean> {
        const response = await this.request(`/api/invoices/clear-tests`, {
            method: "POST",
        });

        return response.success;
    }

    async cleanupUnvalidatedInvoices(): Promise<{ success: boolean; deleted: number }> {
        const response = await this.request<{ deleted: number }>(`/api/invoices/cleanup-unvalidated`, {
            method: "POST",
        });

        return {
            success: response.success,
            deleted: (response.data as any)?.deleted ?? 0,
        };
    }
}
