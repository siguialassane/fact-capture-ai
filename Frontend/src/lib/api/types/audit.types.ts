/**
 * Types pour l'Audit
 */

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
