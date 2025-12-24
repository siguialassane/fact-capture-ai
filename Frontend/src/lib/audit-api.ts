/**
 * API Client pour l'Audit Comptable
 * 
 * Utilise Gemini pour auditer les états financiers et détecter les anomalies
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Types
export interface AuditAnomalie {
  type: "Classification" | "Calcul" | "Équilibre" | "Cohérence" | "Doublon";
  compte?: string;
  description: string;
  impact: string;
  montant_errone?: number;
  montant_attendu?: number;
  correction_proposee: string;
  reference_syscohada?: string;
}

export interface AuditResult {
  status: "CONFORME" | "ANOMALIE";
  niveau: "OK" | "CRITIQUE" | "MAJEURE" | "MINEURE" | "OBSERVATION";
  anomalies: AuditAnomalie[];
  resume_audit: string;
  points_verification?: string[];
  recommandations: string[];
  timestamp: string;
  duree_ms?: number;
}

export interface AuditRapide {
  equilibre_bilan: boolean;
  total_actif: number;
  total_passif: number;
  ecart: number;
  nb_ecritures: number;
  alertes: string[];
}

/**
 * Lance un audit complet des états financiers avec Gemini
 */
export async function auditEtatsFinanciers(exercice: string): Promise<AuditResult> {
  try {
    const response = await fetch(`${API_BASE}/audit/etats-financiers?exercice=${exercice}`);
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("[Audit API] Erreur:", error);
    throw error;
  }
}

/**
 * Lance un audit rapide sans IA
 */
export async function auditRapide(exercice: string): Promise<AuditRapide> {
  try {
    const response = await fetch(`${API_BASE}/audit/rapide?exercice=${exercice}`);
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("[Audit Rapide API] Erreur:", error);
    throw error;
  }
}

/**
 * Audite une écriture comptable spécifique
 */
export async function auditEcriture(facture: object, ecriture: object): Promise<AuditResult> {
  try {
    const response = await fetch(`${API_BASE}/audit/ecriture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ facture, ecriture }),
    });
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("[Audit Écriture API] Erreur:", error);
    throw error;
  }
}
