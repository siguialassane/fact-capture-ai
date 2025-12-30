/**
 * Export API Client
 * 
 * Méthodes pour l'export des données
 */

import { BaseApiClient } from "./base-client";
import type { InvoiceAIResult } from "../types";

export class ExportClient extends BaseApiClient {

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
