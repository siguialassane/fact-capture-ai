/**
 * Audit API Client
 * 
 * Méthodes pour l'audit comptable IA
 */

import { BaseApiClient } from "./base-client";
import type { AuditResult, AuditRapide } from "../types";

export class AuditClient extends BaseApiClient {

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
}
