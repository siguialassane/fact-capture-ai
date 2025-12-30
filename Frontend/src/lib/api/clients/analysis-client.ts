/**
 * Analysis API Client
 * 
 * Méthodes pour l'analyse d'images et le chat IA
 */

import { BaseApiClient } from "./base-client";
import type { InvoiceAIResult, ChatContext } from "../types";

export class AnalysisClient extends BaseApiClient {

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
}
