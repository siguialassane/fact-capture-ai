/**
 * Types et constantes partagés pour les journaux
 */

import type { JournalCode, JournalEntryRecord } from "@/lib/api/backend-client";

// Configuration visuelle stricte par journal
export const JOURNAL_THEMES: Record<JournalCode, { border: string; bg: string; text: string; lightBg: string }> = {
    AC: { border: "border-orange-500", bg: "bg-orange-500", text: "text-orange-700", lightBg: "bg-orange-50" },
    VE: { border: "border-emerald-500", bg: "bg-emerald-500", text: "text-emerald-700", lightBg: "bg-emerald-50" },
    BQ: { border: "border-blue-500", bg: "bg-blue-500", text: "text-blue-700", lightBg: "bg-blue-50" },
    CA: { border: "border-purple-500", bg: "bg-purple-500", text: "text-purple-700", lightBg: "bg-purple-50" },
    OD: { border: "border-slate-500", bg: "bg-slate-500", text: "text-slate-700", lightBg: "bg-slate-50" },
};

export interface DragData {
    entryId: string;
    fromJournal: JournalCode;
    libelle: string;
    montant: number;
    numeroPiece: string;
}

export interface CorrectionConfirmation {
    entry: JournalEntryRecord;
    fromJournal: JournalCode;
    toJournal: JournalCode;
}

// Formatage des montants
export const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 }).format(amount);
};

export const formatAmountCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount);
};
