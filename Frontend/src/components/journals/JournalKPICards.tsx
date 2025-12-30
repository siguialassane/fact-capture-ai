/**
 * JournalKPICards - Grille de KPI par journal
 */

import { DragEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JournalCode, JournalConfig, JournalSummary } from "@/lib/api/backend-client";
import { JOURNAL_THEMES, formatAmount, type DragData } from "./journal-types";

interface JournalKPICardsProps {
    journaux: JournalConfig[];
    summaries: JournalSummary[];
    selectedJournal: JournalCode | null;
    onSelectJournal: (code: JournalCode | null) => void;
    draggedEntry: DragData | null;
    dropTarget: JournalCode | null;
    onDragOver: (e: DragEvent<HTMLDivElement>, code: JournalCode) => void;
    onDragLeave: () => void;
    onDrop: (e: DragEvent<HTMLDivElement>, code: JournalCode) => void;
}

export function JournalKPICards({
    journaux,
    summaries,
    selectedJournal,
    onSelectJournal,
    draggedEntry,
    dropTarget,
    onDragOver,
    onDragLeave,
    onDrop,
}: JournalKPICardsProps) {
    const getSummaryForJournal = (code: JournalCode): JournalSummary | undefined => {
        return summaries.find(s => s.journal_code === code);
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {journaux.map((journal) => {
                const summary = getSummaryForJournal(journal.code);
                const isActive = selectedJournal === journal.code;
                const isTarget = dropTarget === journal.code;
                const theme = JOURNAL_THEMES[journal.code] || JOURNAL_THEMES.OD;

                return (
                    <div
                        key={journal.code}
                        onClick={() => !draggedEntry && onSelectJournal(isActive ? null : journal.code)}
                        onDragOver={(e) => onDragOver(e, journal.code)}
                        onDragLeave={onDragLeave}
                        onDrop={(e) => onDrop(e, journal.code)}
                        className={cn(
                            "relative cursor-pointer transition-all duration-200 rounded-xl border bg-white p-5 flex flex-col justify-between min-h-[110px]",
                            isActive
                                ? `ring-2 ring-offset-2 ring-${theme.bg.split('-')[1]} shadow-md border-transparent`
                                : "hover:border-slate-300 hover:shadow-sm border-slate-200",
                            isTarget && "scale-105 ring-4 ring-amber-400 bg-amber-50 border-amber-300 z-10",
                            draggedEntry && draggedEntry.fromJournal !== journal.code && !isTarget && "border-dashed border-2 opacity-60 bg-slate-50"
                        )}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-slate-700 text-sm tracking-wide">{journal.libelle}</span>
                            <Badge variant="outline" className={cn("font-mono font-bold border-0 bg-slate-100", theme.text)}>
                                {journal.code}
                            </Badge>
                        </div>

                        <div>
                            {summary ? (
                                <div className="flex flex-col gap-1">
                                    <span className="text-2xl font-bold text-slate-900 tracking-tight">
                                        {formatAmount(summary.total_debit)}
                                        <span className="text-sm text-slate-400 font-normal ml-1">F</span>
                                    </span>
                                    <span className="text-xs font-semibold text-slate-400 uppercase">
                                        {summary.nb_ecritures} Écritures
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1 opacity-50">
                                    <span className="text-2xl font-bold text-slate-300 tracking-tight">
                                        0 <span className="text-sm text-slate-300 font-normal ml-1">F</span>
                                    </span>
                                    <span className="text-xs font-semibold text-slate-300 uppercase">
                                        0 Écritures
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Active Indicator */}
                        {isActive && (
                            <div className={cn("absolute bottom-0 left-0 w-full h-1 rounded-b-xl", theme.bg)}></div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
