/**
 * AccountingEntryView Component
 * 
 * Vue principale pour la validation de l'écriture comptable.
 * Design aéré et terminologie professionnelle.
 */

import { useState, useEffect } from "react";
import {
  BookOpen,
  Check,
  RefreshCw,
  Save,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Calendar,
  Hash,
  User,
  FileText,
  Clock,
  PieChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { JournalEntry, AccountingStatus, StatutPaiement } from "@/lib/accounting-api";
import type { FlexibleInvoiceAIResult } from "@/lib/openrouter";

interface AccountingEntryViewProps {
  entry: JournalEntry | null;
  status: AccountingStatus;
  reasoning?: {
    thinking_content: string;
    duration_ms?: number;
  };
  suggestions?: string[];
  invoiceData?: FlexibleInvoiceAIResult;
  confirmedStatus?: StatutPaiement;
  confirmedPartialAmount?: number;
  onRefine?: (feedback: string) => void;
  onSave?: () => void;
  onChat?: (message: string, entry: JournalEntry) => Promise<string>;
  onRegenerate?: () => void;
  onRegenerateWithStatus?: (status: StatutPaiement, partialAmount?: number) => void;
  isSaving?: boolean;
  isSaved?: boolean;
}

export function AccountingEntryView({
  entry,
  status,
  confirmedStatus,
  confirmedPartialAmount,
  onSave,
  onRegenerate,
  onRegenerateWithStatus,
  isSaving = false,
  isSaved = false,
}: AccountingEntryViewProps) {

  // State pour le changement de statut
  const [newStatus, setNewStatus] = useState<StatutPaiement | undefined>(confirmedStatus);
  const [newPartialAmount, setNewPartialAmount] = useState<number | undefined>(confirmedPartialAmount);

  // Mettre à jour le state local si la prop change
  useEffect(() => {
    setNewStatus(confirmedStatus);
    setNewPartialAmount(confirmedPartialAmount);
  }, [confirmedStatus, confirmedPartialAmount]);

  const handleRegenerateClick = () => {
    if (newStatus && onRegenerateWithStatus) {
      onRegenerateWithStatus(newStatus, newStatus === "partiel" ? newPartialAmount : undefined);
    } else if (onRegenerate) {
      onRegenerate();
    }
  };

  const formatAmount = (amount?: number | string) => {
    if (amount === undefined || amount === null) return "-";
    const num = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  // --- RENDU : CHARGEMENT ---
  if (status === "generating") {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-6 text-center h-full bg-slate-50/50">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full animate-pulse" />
          <RefreshCw className="h-16 w-16 text-violet-600 animate-spin relative z-10" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Analyse comptable en cours...</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Le système génère les écritures selon le plan comptable SYSCOHADA.
          </p>
        </div>
      </div>
    );
  }

  // --- RENDU : ERREUR ---
  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center h-full text-red-600 bg-red-50/10">
        <AlertCircle className="h-16 w-16" />
        <h3 className="text-xl font-semibold">Échec de l'analyse</h3>
        <p className="text-slate-600">Impossible de générer l'écriture comptable.</p>
        <Button onClick={onRegenerate} variant="outline" className="mt-4 border-red-200 hover:bg-red-50 text-red-700">
          <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
        </Button>
      </div>
    );
  }

  if (!entry) return null;

  return (
    <div className="h-full flex flex-col bg-slate-50/30">

      {/* Header Fixe */}
      <div className="flex-none flex items-center justify-between px-8 py-5 bg-white border-b border-sidebar-border/50 shadow-sm z-10 transition-all">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-violet-100 rounded-xl shadow-sm border border-violet-200">
            <BookOpen className="h-6 w-6 text-violet-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Comptabilisation</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
              <span className="font-medium text-slate-400">Journal suggéré :</span>
              <span className="font-mono font-bold bg-slate-100 px-2.5 py-0.5 rounded text-slate-700 border border-slate-200">
                {entry.journal_code}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={onSave}
            disabled={isSaving || isSaved}
            size="lg"
            className={`shadow-md transition-all font-semibold ${isSaved ? "bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-100" : "bg-violet-600 hover:bg-violet-700 ring-2 ring-violet-100"}`}
          >
            {isSaving ? (
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            ) : isSaved ? (
              <Check className="h-5 w-5 mr-2" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            {isSaved ? "Validé & Enregistré" : "Valider l'écriture"}
          </Button>
        </div>
      </div>

      {/* Main Content - SCROLLABLE */}
      <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">

          {/* Bloc Informations de l'Écriture */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date & Ref */}
            <Card className="border shadow-sm bg-white md:col-span-1">
              <CardContent className="p-4 flex flex-col justify-center h-full gap-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-medium text-slate-600">Date:</span>
                  <span className="text-sm font-bold text-slate-800">{formatDate(entry.date_piece)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-medium text-slate-600">Pièce N°:</span>
                  <span className="text-sm font-bold text-slate-800 truncate" title={entry.numero_piece}>{entry.numero_piece}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tiers & Libellé */}
            <Card className="border shadow-sm bg-white md:col-span-2">
              <CardContent className="p-4 flex flex-col justify-center h-full gap-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-violet-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wide">Tiers / Partenaire</span>
                    <span className="text-base font-bold text-slate-800">{entry.tiers_nom || "Non identifié"}</span>
                  </div>
                </div>
                {entry.libelle_general && (
                  <div className="flex items-start gap-3 border-t border-slate-100 pt-2 mt-1">
                    <FileText className="h-4 w-4 text-violet-500 mt-0.5" />
                    <span className="text-sm text-slate-600 italic">"{entry.libelle_general}"</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Carte Écriture - Design Aéré */}
          <Card className="border-0 shadow-md ring-1 ring-slate-200 bg-white overflow-hidden rounded-xl">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-violet-500" />
                Proposition d'écriture comptable
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-b border-slate-100">
                    <TableHead className="w-[100px] font-bold text-slate-600 py-4 pl-6">Compte</TableHead>
                    <TableHead className="font-bold text-slate-600 py-4">Libellé de l'écriture</TableHead>
                    <TableHead className="text-right w-[140px] font-bold text-slate-600 py-4">Débit</TableHead>
                    <TableHead className="text-right w-[140px] font-bold text-slate-600 py-4 pr-6">Crédit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.lignes.map((ligne, idx) => (
                    <TableRow key={idx} className="hover:bg-violet-50/30 transition-colors border-b border-slate-50 last:border-0 group">
                      <TableCell className="py-5 pl-6 align-top">
                        <span className="font-mono font-bold text-violet-700 text-base bg-violet-50 px-2 py-1 rounded border border-violet-100 group-hover:bg-white transition-colors">
                          {ligne.numero_compte}
                        </span>
                      </TableCell>
                      <TableCell className="py-5 align-top">
                        <div className="font-bold text-slate-800 text-base mb-1">{ligne.libelle_compte}</div>
                        {ligne.libelle_ligne && (
                          <div className="text-sm text-slate-500 font-light italic flex items-center gap-2">
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            {ligne.libelle_ligne}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-5 align-top">
                        {ligne.debit > 0 ? (
                          <span className="font-mono font-medium text-slate-700 text-base">{formatAmount(ligne.debit)}</span>
                        ) : <span className="text-slate-300 font-light">-</span>}
                      </TableCell>
                      <TableCell className="text-right py-5 pr-6 align-top">
                        {ligne.credit > 0 ? (
                          <span className="font-mono font-medium text-slate-700 text-base">{formatAmount(ligne.credit)}</span>
                        ) : <span className="text-slate-300 font-light">-</span>}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totaux - Style Distinct */}
                  <TableRow className="bg-slate-50/80 border-t-2 border-slate-200">
                    <TableCell colSpan={2} className="text-right pr-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                      Totaux Généraux
                    </TableCell>
                    <TableCell className="text-right py-4 font-mono text-emerald-700 font-bold text-base bg-emerald-50/30 border-l border-slate-200">
                      {formatAmount(entry.total_debit)}
                    </TableCell>
                    <TableCell className="text-right py-4 pr-6 font-mono text-emerald-700 font-bold text-base bg-emerald-50/30 border-l border-slate-200">
                      {formatAmount(entry.total_credit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            {entry.equilibre && (
              <div className="bg-emerald-50/50 border-t border-emerald-100 p-3 flex justify-center">
                <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200 px-4 py-1.5 shadow-sm gap-2 text-sm font-medium hover:bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Écriture parfaitement équilibrée
                </Badge>
              </div>
            )}
          </Card>

          {/* Carte Gestion Statut Paiement (Professional UI) */}
          <Card className="border shadow-md ring-1 ring-slate-200 bg-white overflow-hidden rounded-xl">
            <div className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-blue-300" />
                <span className="font-semibold tracking-wide text-sm">CONFIGURATION DU PAIEMENT</span>
              </div>
            </div>

            <CardContent className="p-8">
              {/* Status Actuel - Visualisation */}
              <div className="mb-8 p-5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                <div className={`p-3 rounded-full shrink-0 ${confirmedStatus === 'paye' ? 'bg-emerald-100 text-emerald-600' :
                    confirmedStatus === 'non_paye' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                  }`}>
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1 block">Configuration actuelle</span>
                  <strong className="text-lg text-slate-800">
                    {confirmedStatus === "paye" && "Paiement intégral (Comptant)"}
                    {confirmedStatus === "non_paye" && "Non payé (À crédit)"}
                    {confirmedStatus === "partiel" && "Paiement partiel"}
                    {(!confirmedStatus || confirmedStatus === "inconnu") && "Statut inconnu"}
                  </strong>
                </div>
              </div>

              <div className="space-y-6">
                <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide block mb-3 pl-1">
                  Modifier le mode de règlement
                </Label>

                <RadioGroup
                  value={newStatus}
                  onValueChange={(v) => setNewStatus(v as StatutPaiement)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {/* OPTION 1: Payé */}
                  <label className={`relative flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all hover:bg-slate-50 group ${newStatus === 'paye' ? 'border-emerald-500 bg-emerald-50/20 shadow-sm ring-1 ring-emerald-500' : 'border-slate-200'}`}>
                    <RadioGroupItem value="paye" id="r1" className="sr-only" />
                    <CheckCircle2 className={`h-8 w-8 mb-2 transition-colors ${newStatus === 'paye' ? 'text-emerald-500' : 'text-slate-300 group-hover:text-slate-400'}`} />
                    <span className={`font-bold ${newStatus === 'paye' ? 'text-emerald-900' : 'text-slate-700'}`}>Payé</span>
                    <span className="text-xs text-slate-500 mt-1">Comptant / Banque</span>
                  </label>

                  {/* OPTION 2: Non Payé */}
                  <label className={`relative flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all hover:bg-slate-50 group ${newStatus === 'non_paye' ? 'border-amber-500 bg-amber-50/20 shadow-sm ring-1 ring-amber-500' : 'border-slate-200'}`}>
                    <RadioGroupItem value="non_paye" id="r2" className="sr-only" />
                    <Clock className={`h-8 w-8 mb-2 transition-colors ${newStatus === 'non_paye' ? 'text-amber-500' : 'text-slate-300 group-hover:text-slate-400'}`} />
                    <span className={`font-bold ${newStatus === 'non_paye' ? 'text-amber-900' : 'text-slate-700'}`}>À Crédit</span>
                    <span className="text-xs text-slate-500 mt-1">Dette fournisseur</span>
                  </label>

                  {/* OPTION 3: Partiel */}
                  <label className={`relative flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all hover:bg-slate-50 group ${newStatus === 'partiel' ? 'border-blue-500 bg-blue-50/20 shadow-sm ring-1 ring-blue-500' : 'border-slate-200'}`}>
                    <RadioGroupItem value="partiel" id="r3" className="sr-only" />
                    <PieChart className={`h-8 w-8 mb-2 transition-colors ${newStatus === 'partiel' ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-400'}`} />
                    <span className={`font-bold ${newStatus === 'partiel' ? 'text-blue-900' : 'text-slate-700'}`}>Partiel</span>
                    <span className="text-xs text-slate-500 mt-1">Acompte versé</span>
                  </label>
                </RadioGroup>

                {newStatus === "partiel" && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="partial-amount-edit" className="text-xs font-bold text-blue-700 uppercase mb-2 block">Montant déjà réglé</Label>
                    <div className="relative">
                      <Input
                        id="partial-amount-edit"
                        type="number"
                        value={newPartialAmount || ""}
                        onChange={(e) => setNewPartialAmount(parseFloat(e.target.value))}
                        className="pl-4 pr-16 h-12 text-lg font-mono border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                        placeholder="0"
                      />
                      <span className="absolute right-4 top-3 text-sm font-bold text-slate-400">FCFA</span>
                    </div>
                  </div>
                )}

                <div className="pt-6 flex justify-end border-t border-slate-100 mt-4">
                  <Button
                    onClick={handleRegenerateClick}
                    className={`transition-all w-full md:w-auto ${newStatus !== confirmedStatus || newPartialAmount !== confirmedPartialAmount ? 'bg-violet-600 hover:bg-violet-700 shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200'}`}
                    disabled={newStatus === confirmedStatus && newPartialAmount === confirmedPartialAmount}
                    size="lg"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${newStatus !== confirmedStatus ? 'animate-spin-slow' : ''}`} />
                    Mettre à jour l'écriture
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
