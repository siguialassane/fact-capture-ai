/**
 * JournalCorrectionDialog - Dialogue de confirmation de correction d'imputation
 */

import {
    AlertTriangle,
    ChevronRight,
    CheckCircle2,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { JournalCode } from "@/lib/api/backend-client";
import { JOURNAL_THEMES, formatAmountCurrency, type CorrectionConfirmation } from "./journal-types";

interface JournalCorrectionDialogProps {
    correctionDialog: CorrectionConfirmation | null;
    isCorreecting: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function JournalCorrectionDialog({
    correctionDialog,
    isCorreecting,
    onClose,
    onConfirm,
}: JournalCorrectionDialogProps) {
    if (!correctionDialog) return null;

    return (
        <Dialog open={!!correctionDialog} onOpenChange={() => !isCorreecting && onClose()}>
            <DialogContent className="sm:max-w-[600px] border-0 shadow-2xl">
                <DialogHeader className="bg-slate-50 -mx-6 -mt-6 px-6 py-4 border-b border-slate-100">
                    <DialogTitle className="flex items-center gap-2 text-slate-800">
                        <div className="bg-amber-100 p-1.5 rounded-full">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        Correction d'imputation comptable
                    </DialogTitle>
                    <DialogDescription>
                        Confirmation du déplacement d'une écriture entre journaux.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    {/* Visualisation Flux */}
                    <div className="flex items-center justify-between px-8">
                        {/* Source */}
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Origine</span>
                            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg", JOURNAL_THEMES[correctionDialog.fromJournal].bg)}>
                                {correctionDialog.fromJournal}
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex flex-col items-center gap-1 flex-1 px-4">
                            <div className="w-full h-0.5 bg-slate-200 relative">
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 -ml-1">
                                    <ChevronRight className="h-4 w-4 text-slate-300" />
                                </div>
                            </div>
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                Correction manuelle
                            </span>
                        </div>

                        {/* Dest */}
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Destination</span>
                            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg ring-4 ring-offset-2 ring-emerald-100", JOURNAL_THEMES[correctionDialog.toJournal].bg)}>
                                {correctionDialog.toJournal}
                            </div>
                        </div>
                    </div>

                    {/* Détails Écriture */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    {correctionDialog.entry.numero_piece}
                                    <Badge variant="outline" className="text-[10px] h-5 bg-white">
                                        {new Date(correctionDialog.entry.date_piece).toLocaleDateString()}
                                    </Badge>
                                </h4>
                                <p className="text-sm text-slate-600 mt-1">{correctionDialog.entry.libelle_general}</p>
                            </div>
                            <span className="font-mono font-bold text-lg text-slate-900">
                                {formatAmountCurrency(correctionDialog.entry.total_debit)}
                            </span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Mise à jour automatique des comptes de contrepartie
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 px-6 py-4 border-t border-slate-100">
                    <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-slate-800 hover:bg-white">Annuler</Button>
                    <Button onClick={onConfirm} className="bg-slate-900 hover:bg-slate-800 shadow-lg text-white font-medium px-6">
                        {isCorreecting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Traitement...
                            </>
                        ) : "Confirmer le transfert"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
