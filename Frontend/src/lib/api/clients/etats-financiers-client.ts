/**
 * États Financiers API Client
 * 
 * Méthodes pour le bilan, compte de résultat et indicateurs
 */

import { BaseApiClient, BACKEND_URL } from "./base-client";
import type { Bilan, CompteResultat, Indicateurs } from "../types";

export class EtatsFinanciersClient extends BaseApiClient {

    async getBilan(exercice: string): Promise<Bilan | null> {
        try {
            const url = `${BACKEND_URL}/api/etats-financiers/bilan?exercice=${exercice}`;
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
            const url = `${BACKEND_URL}/api/etats-financiers/resultat?exercice=${exercice}`;
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
            const url = `${BACKEND_URL}/api/etats-financiers/indicateurs?exercice=${exercice}`;
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
}
