/**
 * Grand Livre API Client
 * 
 * Méthodes pour la consultation du grand livre et de la balance
 */

import { BaseApiClient } from "./base-client";
import type { GrandLivreAccount, GrandLivreDetail, GrandLivreEntry, Balance } from "../types";

export class GrandLivreClient extends BaseApiClient {

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
}
