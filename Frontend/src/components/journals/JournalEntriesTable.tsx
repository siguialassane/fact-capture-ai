/**
 * JournalEntriesTable - Tableau des écritures d'un journal
 */

import { DragEvent } from "react";
import {
    GripVertical,
    Loader2,
    Filter,
    Search,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { JournalCode, JournalConfig, JournalEntryRecord } from "@/lib/api/backend-client";
import { JOURNAL_THEMES, formatAmount, formatAmountCurrency } from "./journal-types";

interface JournalEntriesTableProps {
    selectedJournal: JournalCode;
    journaux: JournalConfig[];
    entries: JournalEntryRecord[];
    loadingEntries: boolean;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    expandedEntry: string | null;
    onToggleExpand: (id: string, e: React.MouseEvent) => void;
    onDragStart: (e: DragEvent<HTMLTableRowElement>, entry: JournalEntryRecord) => void;
    onDragEnd: () => void;
}

export function JournalEntriesTable({
    selectedJournal,
    journaux,
    entries,
    loadingEntries,
    searchTerm,
    onSearchChange,
    expandedEntry,
    onToggleExpand,
    onDragStart,
    onDragEnd,
}: JournalEntriesTableProps) {
    // Filtrage
    const filteredEntries = entries.filter(e =>
        (e.libelle_general || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.numero_piece || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.tiers_nom && e.tiers_nom.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const theme = JOURNAL_THEMES[selectedJournal];

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            {/* Toolbar Tableau */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-8 rounded-full", theme.bg)}></div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">
                            Journal {journaux.find(j => j.code === selectedJournal)?.libelle} ({selectedJournal})
                        </h3>
                        <p className="text-xs text-slate-500">
                            {entries.length} écritures trouvées sur la période
                        </p>
                    </div>
                </div>

                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Rechercher une pièce..."
                        className="pl-9 bg-slate-50 border-slate-200"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            {/* Tableau */}
            <div className="overflow-x-auto">
                {loadingEntries ? (
                    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-4" />
                        <p>Chargement des lignes...</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-slate-50/30">
                        <div className="bg-slate-100 p-4 rounded-full mb-4">
                            <Filter className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="font-medium">Aucune écriture dans ce journal</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80 border-b border-slate-200 hover:bg-slate-50/80">
                                <TableHead className="w-[40px]"></TableHead>
                                <TableHead className="w-[120px] font-bold text-slate-700 uppercase text-xs tracking-wider">Date</TableHead>
                                <TableHead className="w-[140px] font-bold text-slate-700 uppercase text-xs tracking-wider">N° Pièce</TableHead>
                                <TableHead className="font-bold text-slate-700 uppercase text-xs tracking-wider">Libellé</TableHead>
                                <TableHead className="font-bold text-slate-700 uppercase text-xs tracking-wider">Tiers</TableHead>
                                <TableHead className="text-right font-bold text-slate-700 uppercase text-xs tracking-wider w-[160px]">Montant</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEntries.map((entry) => {
                                const isExpanded = expandedEntry === String(entry.id);
                                return (
                                    <>
                                        <TableRow
                                            key={entry.id}
                                            className={cn(
                                                "group cursor-pointer transition-all border-b border-slate-100 hover:bg-slate-50/50",
                                                isExpanded && "bg-slate-50 border-b-0"
                                            )}
                                            onClick={(e) => onToggleExpand(String(entry.id), e)}
                                            draggable
                                            onDragStart={(e) => onDragStart(e, entry)}
                                            onDragEnd={onDragEnd}
                                        >
                                            <TableCell className="pl-4">
                                                <div className="p-1 rounded cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 hover:bg-slate-200 w-fit">
                                                    <GripVertical className="h-4 w-4" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm font-medium text-slate-600">
                                                {new Date(entry.date_piece).toLocaleDateString("fr-FR")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-mono bg-slate-100 text-slate-700 border-slate-200 rounded-sm px-1.5 py-0.5 pointer-events-none group-hover:bg-white transition-colors">
                                                    {entry.numero_piece}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-800">
                                                {entry.libelle_general}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500">
                                                {entry.tiers_nom || <span className="text-slate-300 italic">-</span>}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-slate-700 text-base">
                                                {formatAmount(entry.total_debit)}
                                            </TableCell>
                                            <TableCell className="pr-4">
                                                {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-300" />}
                                            </TableCell>
                                        </TableRow>

                                        {/* Lignes détaillées (Expand) */}
                                        {isExpanded && (
                                            <TableRow className="bg-slate-50 border-b border-slate-200">
                                                <TableCell colSpan={7} className="p-0">
                                                    <div className="px-12 py-6 bg-slate-50/50 shadow-inner">
                                                        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="bg-slate-100/50 h-9">
                                                                        <TableHead className="h-9 text-xs font-bold uppercase tracking-wider pl-4 text-slate-500">Compte</TableHead>
                                                                        <TableHead className="h-9 text-xs font-bold uppercase tracking-wider text-slate-500">Libellé Ligne</TableHead>
                                                                        <TableHead className="h-9 text-xs font-bold uppercase tracking-wider text-right text-slate-500">Débit</TableHead>
                                                                        <TableHead className="h-9 text-xs font-bold uppercase tracking-wider text-right pr-4 text-slate-500">Crédit</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {entry.lignes.map((ligne, idx) => (
                                                                        <TableRow key={`${entry.id}-l-${idx}`} className="h-10 hover:bg-violet-50/20 border-slate-50">
                                                                            <TableCell className="py-1 font-mono text-sm font-bold text-violet-700 pl-4 bg-violet-50/10 w-[120px] border-r border-slate-50/50">
                                                                                {ligne.numero_compte || <span className="text-red-400 text-xs italic">Manquant</span>}
                                                                            </TableCell>
                                                                            <TableCell className="py-1 text-sm text-slate-700">
                                                                                {ligne.libelle_ligne || ligne.libelle_compte || entry.libelle_general || <span className="text-slate-300 italic">Libellé manquant</span>}
                                                                            </TableCell>
                                                                            <TableCell className="py-1 text-right font-mono text-sm text-slate-600">
                                                                                {ligne.debit > 0 ? formatAmountCurrency(ligne.debit) : ""}
                                                                            </TableCell>
                                                                            <TableCell className="py-1 text-right font-mono text-sm text-slate-600 pr-4">
                                                                                {ligne.credit > 0 ? formatAmountCurrency(ligne.credit) : ""}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
