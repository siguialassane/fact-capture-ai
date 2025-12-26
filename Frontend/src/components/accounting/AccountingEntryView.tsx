/**
 * AccountingEntryView Component
 * 
 * Affiche l'écriture comptable générée par l'IA et les articles de la facture côte à côte.
 * Permet de modifier le statut de paiement et de régénérer l'écriture.
 */

import { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  Check,
  RefreshCw,
  Save,
  MessageCircle,
  Table as TableIcon,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AccountingEntryViewProps {
  entry: JournalEntry | null;
  status: AccountingStatus;
  reasoning?: {
    thinking_content: string;
    duration_ms?: number;
  };
  suggestions?: string[];
  invoiceData?: FlexibleInvoiceAIResult; // Données brutes de la facture (articles)
  confirmedStatus?: StatutPaiement; // Statut actuel confirmé
  confirmedPartialAmount?: number;
  onRefine?: (feedback: string) => void;
  onSave?: () => void;
  onChat?: (message: string, entry: JournalEntry) => Promise<string>;
  onRegenerate?: () => void; // Simple regenerate (legacy)
  onRegenerateWithStatus?: (status: StatutPaiement, partialAmount?: number) => void; // New regenerate
  isSaving?: boolean;
  isSaved?: boolean;
}

export function AccountingEntryView({
  entry,
  status,
  reasoning,
  suggestions,
  invoiceData,
  confirmedStatus,
  confirmedPartialAmount,
  onRefine,
  onSave,
  onChat,
  onRegenerate,
  onRegenerateWithStatus,
  isSaving = false,
  isSaved = false,
}: AccountingEntryViewProps) {
  const [activeTab, setActiveTab] = useState<"entry" | "reasoning">("entry");
  const [showChat, setShowChat] = useState(false);

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

  if (status === "generating") {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center h-full">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full animate-pulse" />
          <RefreshCw className="h-16 w-16 text-violet-600 animate-spin relative z-10" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800">Génération de l'écriture...</h3>
        <p className="text-slate-500 max-w-md">
          DeepSeek analyse les données pour produire une écriture comptable SYSCOHADA équilibrée.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center h-full text-red-600">
        <AlertCircle className="h-16 w-16" />
        <h3 className="text-xl font-semibold">Erreur de génération</h3>
        <p className="text-slate-600">Impossible de générer l'écriture comptable.</p>
        <Button onClick={onRegenerate} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
        </Button>
      </div>
    );
  }

  if (!entry) return null;

  return (
    <div className="h-full flex flex-col bg-slate-50/50 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <BookOpen className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Comptabilisation</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-mono">{entry.journal_code}</span>
              <span>•</span>
              <span>{entry.journal_libelle}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className={showChat ? "bg-violet-50 border-violet-200 text-violet-700" : ""}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Assistant
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving || isSaved}
            className={isSaved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-violet-600 hover:bg-violet-700"}
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : isSaved ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaved ? "Enregistré" : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Main Content - Grid Layout */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">

          {/* COLONNE GAUCHE: Écriture Comptable + Gestion Statut */}
          <div className="flex flex-col gap-6">

            {/* Carte Écriture */}
            <Card className="border-sidebar-border/50 shadow-sm flex-grow">
              <CardHeader className="bg-slate-50 border-b border-sidebar-border/50 py-3">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-violet-500" />
                  Écriture Générée par DeepSeek
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="w-[80px]">Compte</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead className="text-right w-[120px]">Débit</TableHead>
                      <TableHead className="text-right w-[120px]">Crédit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.lignes.map((ligne, idx) => (
                      <TableRow key={idx} className="hover:bg-violet-50/30 transition-colors">
                        <TableCell className="font-mono font-medium text-violet-700">
                          {ligne.numero_compte}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-700">{ligne.libelle_compte}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{ligne.libelle_ligne}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-slate-700">
                          {ligne.debit > 0 ? formatAmount(ligne.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-slate-700">
                          {ligne.credit > 0 ? formatAmount(ligne.credit) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totaux */}
                    <TableRow className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                      <TableCell colSpan={2} className="text-right pr-4">TOTAUX</TableCell>
                      <TableCell className="text-right font-mono text-emerald-700">
                        {formatAmount(entry.total_debit)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-700">
                        {formatAmount(entry.total_credit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
              {entry.equilibre && (
                <div className="bg-emerald-50 border-t border-emerald-100 p-2 flex justify-center">
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    Écriture équilibrée
                  </Badge>
                </div>
              )}
            </Card>

            {/* Carte Gestion Statut Paiement (ASCII Art Style UI) */}
            <Card className="border-2 border-slate-200 shadow-sm overflow-hidden transform transition-all hover:border-violet-300">
              <div className="bg-slate-900 text-white p-3 font-mono text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-400" />
                  <span>STATUS_PAIEMENT.CONFIG</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                </div>
              </div>

              <CardContent className="p-5 bg-white">
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>Statut actuel : </strong>
                    {confirmedStatus === "paye" && "✅ Paiement reçu (Journal BQ)"}
                    {confirmedStatus === "non_paye" && "⏳ Non payé / À crédit (Journal ACHATS/VENTES)"}
                    {confirmedStatus === "partiel" && "💰 Paiement partiel (Mixte)"}
                    {(!confirmedStatus || confirmedStatus === "inconnu") && "❓ Inconnu"}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold text-slate-700">
                    🔄 Changer le statut de paiement :
                  </Label>

                  <RadioGroup
                    value={newStatus}
                    onValueChange={(v) => setNewStatus(v as StatutPaiement)}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
                      <RadioGroupItem value="paye" id="r1" />
                      <Label htmlFor="r1" className="cursor-pointer flex-1">
                        ✅ Paiement reçu (Comptant/Banque)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
                      <RadioGroupItem value="non_paye" id="r2" />
                      <Label htmlFor="r2" className="cursor-pointer flex-1">
                        ⏳ Non payé (Créance/Dette)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
                      <RadioGroupItem value="partiel" id="r3" />
                      <Label htmlFor="r3" className="cursor-pointer flex-1">
                        💰 Paiement partiel
                      </Label>
                    </div>
                  </RadioGroup>

                  {newStatus === "partiel" && (
                    <div className="ml-6 pl-4 border-l-2 border-slate-200">
                      <Label htmlFor="partial-amount-edit" className="text-sm">Montant payé :</Label>
                      <Input
                        id="partial-amount-edit"
                        type="number"
                        value={newPartialAmount || ""}
                        onChange={(e) => setNewPartialAmount(parseFloat(e.target.value))}
                        className="mt-1"
                        placeholder="Ex: 500000"
                      />
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={handleRegenerateClick}
                      variant="outline"
                      className="border-violet-200 hover:bg-violet-50 text-violet-700"
                      disabled={newStatus === confirmedStatus && newPartialAmount === confirmedPartialAmount}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Régénérer l'écriture
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* COLONNE DROITE: Articles extraits par Qwen */}
          <div className="flex flex-col gap-4 h-full overflow-hidden">
            <Card className="border-sidebar-border/50 shadow-sm h-full flex flex-col">
              <CardHeader className="bg-slate-50 border-b border-sidebar-border/50 py-3">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <List className="h-4 w-4 text-blue-500" />
                  Articles extraits (Qwen)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-[60px]">Qté</TableHead>
                      <TableHead className="text-right w-[100px]">P.U.</TableHead>
                      <TableHead className="text-right w-[110px]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoiceData as any)?.lignes?.length > 0 ? (
                      (invoiceData as any).lignes.map((article: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-slate-700 text-sm">
                            {article.description || "Article sans nom"}
                          </TableCell>
                          <TableCell className="text-right text-slate-500">
                            {article.quantite}
                          </TableCell>
                          <TableCell className="text-right text-slate-500 tabular-nums">
                            {formatAmount(article.prix_unitaire)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-700 tabular-nums">
                            {formatAmount(article.montant_total)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                          Aucun article détecté ou format de données inconnu.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t border-sidebar-border/50 py-3 flex justify-between">
                <span className="text-sm text-slate-500">Total HT</span>
                <span className="font-bold text-slate-800">
                  {formatAmount((invoiceData as any)?.montant_ht)} FCFA
                </span>
              </CardFooter>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
