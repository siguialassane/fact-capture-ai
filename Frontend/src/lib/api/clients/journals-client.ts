/**
 * Journals API Client
 * 
 * Méthodes pour la gestion des journaux comptables
 */

import { BaseApiClient } from "./base-client";
import type {
    JournalCode,
    JournalConfig,
    JournalSummary,
    JournalEntryRecord,
    RegenerateAdditionalInfo,
    RegeneratedEntry,
    RegenerateResult,
} from "../types";

export class JournalsClient extends BaseApiClient {

    async getJournaux(): Promise<JournalConfig[]> {
        const response = await this.request<JournalConfig[]>("/api/journals");
        return response.data || [];
    }

    async getJournalStats(): Promise<{
        total_ecritures: number;
        total_debit: number;
        total_credit: number;
        par_journal: Record<JournalCode, { nb: number; debit: number; credit: number }>;
    }> {
        const response = await this.request<{
            total_ecritures: number;
            total_debit: number;
            total_credit: number;
            par_journal: Record<JournalCode, { nb: number; debit: number; credit: number }>;
        }>("/api/journals/stats");
        return response.data!;
    }

    async getJournalSummary(periode?: string): Promise<JournalSummary[]> {
        const url = periode && periode !== "all"
            ? `/api/journals/summary?periode=${periode}`
            : "/api/journals/summary";
        const response = await this.request<JournalSummary[]>(url);
        return response.data || [];
    }

    async getJournalEntries(
        journalCode: JournalCode,
        options?: {
            dateDebut?: string;
            dateFin?: string;
            statut?: string;
            limit?: number;
        }
    ): Promise<{ journal_code: JournalCode; ecritures: JournalEntryRecord[]; count: number }> {
        const params = new URLSearchParams();
        if (options?.dateDebut) params.set("date_debut", options.dateDebut);
        if (options?.dateFin) params.set("date_fin", options.dateFin);
        if (options?.statut) params.set("statut", options.statut);
        if (options?.limit) params.set("limit", options.limit.toString());

        const response = await this.request<{
            journal_code: JournalCode;
            ecritures: JournalEntryRecord[];
            count: number;
        }>(`/api/journals/${journalCode}?${params}`);
        return response.data!;
    }

    async getNextPieceNumber(
        journalCode: JournalCode,
        datePiece?: string
    ): Promise<{ numero_piece: string; journal_code: JournalCode; date_piece: string }> {
        const response = await this.request<{
            numero_piece: string;
            journal_code: JournalCode;
            date_piece: string;
        }>("/api/journals/next-piece", {
            method: "POST",
            body: JSON.stringify({ journal_code: journalCode, date_piece: datePiece }),
        });
        return response.data!;
    }

    async correctEntryJournal(
        entryId: string,
        newJournalCode: JournalCode,
        reason?: string
    ): Promise<{
        success: boolean;
        entry?: JournalEntryRecord;
        changes?: {
            old_journal: JournalCode;
            new_journal: JournalCode;
            updated_accounts: Array<{ old_account: string; new_account: string; reason: string }>;
        };
        error?: string;
    }> {
        const response = await this.request<{
            entry: JournalEntryRecord;
            changes: {
                old_journal: JournalCode;
                new_journal: JournalCode;
                updated_accounts: Array<{ old_account: string; new_account: string; reason: string }>;
            };
        }>("/api/journals/correct-journal", {
            method: "POST",
            body: JSON.stringify({
                entry_id: entryId,
                new_journal_code: newJournalCode,
                reason: reason || "Correction manuelle du journal",
            }),
        });

        if (!response.success) {
            return { success: false, error: response.error?.message };
        }
        return { success: true, entry: response.data?.entry, changes: response.data?.changes };
    }

    async regenerateEntryWithAI(
        entryId: string,
        targetJournal: JournalCode,
        additionalInfo: RegenerateAdditionalInfo
    ): Promise<{ success: boolean; data?: RegenerateResult; error?: string }> {
        const response = await this.request<RegenerateResult>("/api/journals/regenerate-entry", {
            method: "POST",
            body: JSON.stringify({
                entry_id: entryId,
                target_journal: targetJournal,
                additional_info: additionalInfo,
            }),
        });

        if (!response.success) {
            return { success: false, error: response.error?.message };
        }
        return { success: true, data: response.data };
    }

    async saveRegeneratedEntry(
        oldEntryId: string,
        newEntry: RegeneratedEntry
    ): Promise<{ success: boolean; data?: { new_entry_id: string; message: string }; error?: string }> {
        const response = await this.request<{ new_entry_id: string; message: string }>(
            "/api/journals/save-regenerated",
            {
                method: "POST",
                body: JSON.stringify({ old_entry_id: oldEntryId, new_entry: newEntry }),
            }
        );

        if (!response.success) {
            return { success: false, error: response.error?.message };
        }
        return { success: true, data: response.data };
    }
}
