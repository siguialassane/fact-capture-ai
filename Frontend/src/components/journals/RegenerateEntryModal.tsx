/**
 * Modal de Régénération d'Écriture avec DeepSeek AI
 * 
 * 3 étapes:
 * 1. Formulaire d'infos supplémentaires
 * 2. Preview de l'écriture générée par l'IA
 * 3. Confirmation et sauvegarde
 */

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Loader2,
    Sparkles,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    AlertTriangle,
    Brain,
    Save,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    regenerateEntryWithAI,
    saveRegeneratedEntry,
    type JournalCode,
    type JournalEntryRecord as JournalEntry,
    type RegenerateAdditionalInfo,
    type RegeneratedEntry,
    type RegenerateResult,
} from "@/lib/api/backend-client";

interface RegenerateEntryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: JournalEntry;
    fromJournal: JournalCode;
    toJournal: JournalCode;
    onSuccess: () => void;
}

type Step = "form" | "preview" | "saving";

// Labels des journaux
const JOURNAL_LABELS: Record<JournalCode, string> = {
    AC: "Journal des Achats",
    VE: "Journal des Ventes",
    BQ: "Journal de Banque",
    CA: "Journal de Caisse",
    OD: "Journal des Opérations Diverses",
};

// Couleurs des journaux
const JOURNAL_COLORS: Record<JournalCode, string> = {
    AC: "bg-orange-500",
    VE: "bg-emerald-500",
    BQ: "bg-blue-500",
    CA: "bg-purple-500",
    OD: "bg-slate-500",
};

export function RegenerateEntryModal({
    open,
    onOpenChange,
    entry,
    fromJournal,
    toJournal,
    onSuccess,
}: RegenerateEntryModalProps) {
    const [step, setStep] = useState<Step>("form");
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [tiersName, setTiersName] = useState(entry.tiers_nom || "");
    const [tiersType, setTiersType] = useState<"client" | "fournisseur">(
        toJournal === "VE" ? "client" : "fournisseur"
    );
    const [paymentMode, setPaymentMode] = useState<RegenerateAdditionalInfo["payment_mode"]>(
        toJournal === "CA" ? "especes" : toJournal === "BQ" ? "virement" : "credit"
    );
    const [reason, setReason] = useState("");

    // Result state
    const [regenerateResult, setRegenerateResult] = useState<RegenerateResult | null>(null);

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "XOF",
            minimumFractionDigits: 0
        }).format(amount);
    };

    // Appeler DeepSeek pour régénérer l'écriture
    const handleGenerate = async () => {
        if (!reason.trim()) {
            toast.error("Veuillez indiquer la raison de la transformation");
            return;
        }

        setIsLoading(true);
        try {
            const result = await regenerateEntryWithAI(
                String(entry.id),
                toJournal,
                {
                    new_tiers_name: tiersName || undefined,
                    new_tiers_type: tiersType,
                    payment_mode: paymentMode,
                    reason: reason,
                }
            );

            if (!result.success || !result.data) {
                toast.error(result.error || "Erreur lors de la régénération");
                return;
            }

            setRegenerateResult(result.data);
            setStep("preview");
            toast.success("Proposition générée par DeepSeek !");
        } catch (error) {
            console.error("Erreur régénération:", error);
            toast.error("Erreur de communication avec l'IA");
        } finally {
            setIsLoading(false);
        }
    };

    // Sauvegarder l'écriture régénérée
    const handleSave = async () => {
        if (!regenerateResult?.proposed_entry) return;

        setStep("saving");
        setIsLoading(true);
        try {
            const result = await saveRegeneratedEntry(
                String(entry.id),
                regenerateResult.proposed_entry
            );

            if (!result.success) {
                toast.error(result.error || "Erreur lors de la sauvegarde");
                setStep("preview");
                return;
            }

            toast.success("Écriture transformée avec succès !");
            onSuccess();
            onOpenChange(false);
            // Reset state
            setStep("form");
            setRegenerateResult(null);
        } catch (error) {
            console.error("Erreur sauvegarde:", error);
            toast.error("Erreur lors de la sauvegarde");
            setStep("preview");
        } finally {
            setIsLoading(false);
        }
    };

    // Fermer et reset
    const handleClose = () => {
        if (!isLoading) {
            setStep("form");
            setRegenerateResult(null);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="bg-gradient-to-r from-slate-50 to-violet-50 -mx-6 -mt-6 px-6 py-5 border-b">
                    <DialogTitle className="flex items-center gap-3 text-slate-800">
                        <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-2 rounded-lg shadow-lg">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        Transformation avec DeepSeek AI
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-2">
                        <Badge className={cn("text-white font-mono", JOURNAL_COLORS[fromJournal])}>
                            {fromJournal}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                        <Badge className={cn("text-white font-mono", JOURNAL_COLORS[toJournal])}>
                            {toJournal}
                        </Badge>
                        <span className="text-slate-500 ml-2">
                            {entry.numero_piece} • {formatAmount(entry.total_debit)}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                {/* Étape 1: Formulaire */}
                {step === "form" && (
                    <div className="py-4 space-y-5">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-amber-800">Transformation comptable</p>
                                <p className="text-amber-700 mt-1">
                                    DeepSeek va analyser l'écriture et proposer une nouvelle version adaptée
                                    au journal <strong>{JOURNAL_LABELS[toJournal]}</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="tiers-name">Nom du tiers</Label>
                                    <Input
                                        id="tiers-name"
                                        value={tiersName}
                                        onChange={(e) => setTiersName(e.target.value)}
                                        placeholder="Ex: Fournisseur XYZ"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type de tiers</Label>
                                    <Select value={tiersType} onValueChange={(v) => setTiersType(v as any)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fournisseur">Fournisseur</SelectItem>
                                            <SelectItem value="client">Client</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Mode de paiement</Label>
                                <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as any)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="especes">Espèces (Caisse)</SelectItem>
                                        <SelectItem value="virement">Virement bancaire</SelectItem>
                                        <SelectItem value="carte_bancaire">Carte bancaire</SelectItem>
                                        <SelectItem value="cheque">Chèque</SelectItem>
                                        <SelectItem value="credit">À crédit (Échéance)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reason">Raison de la transformation *</Label>
                                <Textarea
                                    id="reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Ex: Erreur de classification initiale, cette facture est un achat et non une vente..."
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Étape 2: Preview */}
                {step === "preview" && regenerateResult && (
                    <div className="py-4 space-y-5">
                        {/* Résumé des changements */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-3">
                            <Brain className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-emerald-800">Proposition générée</p>
                                <p className="text-emerald-700 mt-1">
                                    {regenerateResult.reasoning}
                                </p>
                            </div>
                        </div>

                        {/* Nouvelle écriture */}
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-slate-800">
                                        {regenerateResult.proposed_entry.numero_piece}
                                    </h4>
                                    <p className="text-sm text-slate-500">
                                        {regenerateResult.proposed_entry.libelle_general}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={cn("text-white", JOURNAL_COLORS[regenerateResult.proposed_entry.journal_code])}>
                                        {regenerateResult.proposed_entry.journal_code}
                                    </Badge>
                                    {regenerateResult.proposed_entry.equilibre ? (
                                        <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Équilibrée
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive">
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                            Déséquilibrée
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                        <TableHead className="font-bold">Compte</TableHead>
                                        <TableHead className="font-bold">Libellé</TableHead>
                                        <TableHead className="text-right font-bold">Débit</TableHead>
                                        <TableHead className="text-right font-bold">Crédit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {regenerateResult.proposed_entry.lignes.map((ligne, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-mono font-bold text-violet-700">
                                                {ligne.numero_compte}
                                            </TableCell>
                                            <TableCell className="text-slate-600">
                                                {ligne.libelle_ligne || ligne.libelle_compte}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {ligne.debit > 0 ? formatAmount(ligne.debit) : ""}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {ligne.credit > 0 ? formatAmount(ligne.credit) : ""}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="bg-slate-50 px-4 py-3 border-t flex justify-end gap-8">
                                <div>
                                    <span className="text-sm text-slate-500">Total Débit: </span>
                                    <span className="font-mono font-bold">{formatAmount(regenerateResult.proposed_entry.total_debit)}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-500">Total Crédit: </span>
                                    <span className="font-mono font-bold">{formatAmount(regenerateResult.proposed_entry.total_credit)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Étape 3: Sauvegarde en cours */}
                {step === "saving" && (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-violet-600 mb-4" />
                        <p className="font-medium text-slate-800">Sauvegarde en cours...</p>
                        <p className="text-sm text-slate-500 mt-1">
                            L'ancienne écriture sera supprimée et remplacée
                        </p>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    {step === "form" && (
                        <>
                            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                                <X className="h-4 w-4 mr-2" />
                                Annuler
                            </Button>
                            <Button
                                onClick={handleGenerate}
                                disabled={isLoading || !reason.trim()}
                                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Génération...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Générer avec DeepSeek
                                    </>
                                )}
                            </Button>
                        </>
                    )}

                    {step === "preview" && (
                        <>
                            <Button variant="outline" onClick={() => setStep("form")}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Modifier
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={!regenerateResult?.proposed_entry.equilibre}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Valider et Enregistrer
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
