/**
 * Lettrage API Client
 * 
 * Méthodes pour le rapprochement des écritures
 */

import { BaseApiClient } from "./base-client";
import type {
    LigneLettrable,
    GroupeLettrage,
    PropositionLettrage,
    LettrageResult,
    LettrageStats,
} from "../types";

export class LettrageClient extends BaseApiClient {

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
}
