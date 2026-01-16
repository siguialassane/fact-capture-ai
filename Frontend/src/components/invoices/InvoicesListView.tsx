/**
 * Vue Liste des Factures
 *
 * Affiche toutes les factures enregistrées avec possibilité de voir les détails
 */

import { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Loader2,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  Building,
  X,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { backendApi, getInvoice, deleteInvoice, type InvoiceAIResult } from "@/lib/api/backend-client";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  created_at: string;
  ai_result: any | null;
  journal_entries?: Array<{
    id: string;
    journal_code: string;
    statut: string;
    total_debit: number;
    total_credit: number;
    created_at: string;
  }> | null;
}

interface InvoiceDetail {
  id: string;
  image_base64: string;
  ai_result: any | null;
  created_at: string;
}

interface JournalEntryWithInvoice {
  id?: string;
  invoice_id?: number | null;
  journal_code?: string;
  numero_piece?: string;
  date_piece?: string;
  total_debit?: number;
  total_credit?: number;
  statut?: string;
  libelle?: string;
  lignes?: Array<{
    compte_numero?: string;
    libelle_ligne?: string;
    debit?: number;
    credit?: number;
  }>;
}

export function InvoicesListView() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [accountingEntry, setAccountingEntry] = useState<JournalEntryWithInvoice | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [validatingEntry, setValidatingEntry] = useState(false);

  // Charger les factures
  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    try {
      console.log("[InvoicesList] Chargement des factures + écritures...");
      const result = await backendApi.getInvoicesWithEntries(100, 0);
      setInvoices(result.invoices);
    } catch (error) {
      console.error("[InvoicesList] Erreur chargement factures:", error);
      console.error("Erreur chargement factures:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les factures",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // Voir les détails d'une facture
  async function viewInvoiceDetails(id: string) {
    setLoadingDetail(true);
    setShowDetailDialog(true);
    setAccountingEntry(null); // Reset accounting entry
    try {
      console.log(`[InvoicesList] Ouverture détail facture ${id}`);
      const invoice = await getInvoice(id);
      setSelectedInvoice(invoice);

      // Try to fetch accounting entry for this invoice
      const invoiceInList = invoices.find((inv) => inv.id === id);
      const listEntries = invoiceInList?.journal_entries || [];

      if (listEntries.length > 0) {
        const sorted = [...listEntries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setAccountingEntry(sorted[0] as unknown as JournalEntryWithInvoice);
        console.log("[InvoicesList] Écriture trouvée depuis la liste", sorted[0].id);
      } else {
        try {
          const response = await fetch(`http://localhost:3001/api/accounting/entries?invoice_id=${id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.length > 0) {
              setAccountingEntry(data.data[0]);
            }
          }
        } catch (err) {
          console.log("Pas d'écriture comptable trouvée pour cette facture");
        }
      }
    } catch (error) {
      console.error("Erreur chargement détails:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails de la facture",
        variant: "destructive",
      });
      setShowDetailDialog(false);
    } finally {
      setLoadingDetail(false);
    }
  }

  // Supprimer une facture
  async function handleDeleteInvoice(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")) {
      return;
    }

    try {
      console.log(`[InvoicesList] Suppression facture ${id}`);
      const success = await deleteInvoice(id);
      if (success) {
        toast({
          title: "Facture supprimée",
          description: "La facture a été supprimée avec succès",
        });
        await loadInvoices();
      } else {
        throw new Error("Échec de la suppression");
      }
    } catch (error) {
      console.error("[InvoicesList] Erreur suppression facture:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la facture",
        variant: "destructive",
      });
    }
  }

  // Valider une écriture comptable
  async function handleValidateEntry() {
    if (!accountingEntry?.id) return;

    if (!confirm("Êtes-vous sûr de vouloir valider cette écriture ? Cette action est irréversible.")) {
      return;
    }

    setValidatingEntry(true);
    try {
      console.log(`[InvoicesList] Validation écriture ${accountingEntry.id}`);
      const response = await fetch(`http://localhost:3001/api/accounting/entries/${accountingEntry.id}/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de la validation");
      }

      const result = await response.json();

      toast({
        title: "Écriture validée",
        description: "L'écriture comptable a été validée avec succès",
      });

      // Mettre à jour l'écriture affichée avec le nouveau statut
      setAccountingEntry({
        ...accountingEntry,
        statut: "valide",
      });
    } catch (error) {
      console.error("Erreur validation:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de valider l'écriture",
        variant: "destructive",
      });
    } finally {
      setValidatingEntry(false);
    }
  }

  // Filtrer les factures par recherche
  const filteredInvoices = searchQuery
    ? invoices.filter((inv) => {
        const result = inv.ai_result as any;
        if (!result) return false;

        const searchLower = searchQuery.toLowerCase();
        const fournisseurNom = typeof result?.fournisseur === "string"
          ? result.fournisseur
          : result?.fournisseur?.raison_sociale || "";
        return (
          result.numero_facture?.toLowerCase().includes(searchLower) ||
          fournisseurNom.toLowerCase().includes(searchLower) ||
          result.montant_total?.toString().includes(searchLower)
        );
      })
    : invoices;

  const formatMontant = (montant: number | string | null | undefined) => {
    if (montant === null || montant === undefined || montant === "") return "0 FCFA";
    const value = typeof montant === "string"
      ? Number(montant.toString().replace(/[^0-9,.-]/g, "").replace(",", "."))
      : montant;
    if (Number.isNaN(value)) return "0 FCFA";
    return value.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " FCFA";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getLatestEntry = (inv: Invoice) => {
    const entries = inv.journal_entries || [];
    if (entries.length === 0) return null;
    return [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100">
            <FileText className="h-6 w-6 text-violet-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Factures</h2>
            <p className="text-sm text-slate-500">
              {filteredInvoices.length} facture{filteredInvoices.length > 1 ? "s" : ""} enregistrée{filteredInvoices.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher une facture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-[300px]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50">
                <TableRow>
                  <TableHead className="w-[140px]">N° Facture</TableHead>
                  <TableHead className="w-[280px]">Fournisseur/Client</TableHead>
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead className="text-right w-[140px]">Montant Total</TableHead>
                  <TableHead className="text-right w-[130px]">Montant HT</TableHead>
                  <TableHead className="w-[110px]">Statut</TableHead>
                  <TableHead className="w-[140px]">Écriture</TableHead>
                  <TableHead className="text-center w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                      Aucune facture trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const result = invoice.ai_result as any;
                    const latestEntry = getLatestEntry(invoice);
                    const fournisseur = result?.fournisseur || result?.fournisseur?.raison_sociale || result?.client;
                    return (
                      <TableRow key={invoice.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-sm text-violet-600 font-medium">
                          {result?.numero_facture || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[280px]">
                            <div className="font-medium text-slate-800 truncate">
                              {typeof fournisseur === 'string' ? fournisseur : fournisseur || "Non renseigné"}
                            </div>
                            {result?.adresse_fournisseur && (
                              <div className="text-xs text-slate-500 truncate mt-0.5">
                                {result.adresse_fournisseur}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {result?.date_facture ? formatDate(result.date_facture) : "N/A"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium whitespace-nowrap">
                          {formatMontant(result?.montant_total)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-slate-600 whitespace-nowrap">
                          {formatMontant(result?.total_ht || result?.montant_ht)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              result?.statut_paiement === "paye"
                                ? "bg-green-100 text-green-700"
                                : result?.statut_paiement === "partiel"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }
                          >
                            {result?.statut_paiement === "paye"
                              ? "Payé"
                              : result?.statut_paiement === "partiel"
                              ? "Partiel"
                              : "Non payé"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {latestEntry ? (
                            <Badge
                              className={
                                latestEntry.statut === "valide"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : latestEntry.statut === "brouillon"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-slate-50 text-slate-500"
                              }
                            >
                              {latestEntry.journal_code} • {latestEntry.statut}
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-50 text-slate-500">Aucune</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewInvoiceDetails(invoice.id)}
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Détails */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-600" />
              Détails de la facture
            </DialogTitle>
            <DialogDescription>
              Facture du {selectedInvoice?.created_at ? formatDate(selectedInvoice.created_at) : ""}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : selectedInvoice ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Image */}
              <div className="col-span-2 lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Image de la facture</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={selectedInvoice.image_base64}
                      alt="Facture"
                      className="w-full rounded-lg border"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Informations */}
              <div className="col-span-2 lg:col-span-1 space-y-4">
                {/* Informations générales */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Informations générales</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-xs text-slate-500">Numéro de facture</div>
                      <div className="font-mono font-medium text-violet-600">
                        {selectedInvoice.ai_result?.numero_facture || "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Date de facture</div>
                      <div className="font-medium">
                        {selectedInvoice.ai_result?.date_facture
                          ? formatDate(selectedInvoice.ai_result.date_facture)
                          : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Date d'échéance</div>
                      <div className="font-medium">
                        {selectedInvoice.ai_result?.date_echeance
                          ? formatDate(selectedInvoice.ai_result.date_echeance)
                          : "N/A"}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Fournisseur */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Fournisseur
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-xs text-slate-500">Raison sociale</div>
                      <div className="font-medium">
                        {typeof selectedInvoice.ai_result?.fournisseur === "string"
                          ? selectedInvoice.ai_result?.fournisseur
                          : selectedInvoice.ai_result?.fournisseur?.raison_sociale || "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Adresse</div>
                      <div className="text-sm">
                        {selectedInvoice.ai_result?.adresse_fournisseur ||
                          selectedInvoice.ai_result?.fournisseur?.adresse ||
                          "N/A"}
                      </div>
                    </div>
                    {(selectedInvoice.ai_result?.telephone_fournisseur || selectedInvoice.ai_result?.fournisseur?.telephone) && (
                      <div>
                        <div className="text-xs text-slate-500">Téléphone</div>
                        <div className="text-sm">
                          {selectedInvoice.ai_result?.telephone_fournisseur || selectedInvoice.ai_result?.fournisseur?.telephone}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Montants */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Montants
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Montant HT</span>
                      <span className="font-mono font-medium">
                        {formatMontant(selectedInvoice.ai_result?.total_ht)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">TVA</span>
                      <span className="font-mono font-medium">
                        {formatMontant(selectedInvoice.ai_result?.total_tva)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Montant Total</span>
                      <span className="font-mono font-bold text-lg text-violet-600">
                        {formatMontant(selectedInvoice.ai_result?.montant_total)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Articles */}
                {selectedInvoice.ai_result?.articles && selectedInvoice.ai_result.articles.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Articles</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedInvoice.ai_result.articles.map((article: any, idx: number) => (
                          <div key={idx} className="text-sm border-b pb-2 last:border-0">
                            <div className="font-medium">{article.designation || "Article"}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              Qté: {article.quantite || "-"} × {formatMontant(article.prix_unitaire_ht || article.prix_unitaire)} ={" "}
                              <span className="font-medium">{formatMontant(article.montant_ht || article.montant_ttc || article.total)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : null}

          {/* Écriture Comptable */}
          {accountingEntry && (
            <div className="mt-6">
              <Card className="border-indigo-200 bg-indigo-50/30">
                <CardHeader>
                  <CardTitle className="text-sm text-indigo-900 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Écriture Comptable Validée
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Journal:</span>{" "}
                      <span className="font-mono font-medium">{accountingEntry.journal_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">N° Pièce:</span>{" "}
                      <span className="font-mono font-medium">{accountingEntry.numero_piece}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Date:</span>{" "}
                      <span className="font-medium">{formatDate(accountingEntry.date_piece)}</span>
                    </div>
                  </div>

                  {/* Lignes de l'écriture */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-100">
                        <TableRow>
                          <TableHead className="text-xs">Compte</TableHead>
                          <TableHead className="text-xs">Libellé</TableHead>
                          <TableHead className="text-right text-xs">Débit</TableHead>
                          <TableHead className="text-right text-xs">Crédit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountingEntry.lignes?.map((ligne, idx) => (
                          <TableRow key={idx} className="text-xs">
                            <TableCell className="font-mono font-medium text-violet-600">
                              {ligne.compte_numero}
                            </TableCell>
                            <TableCell className="text-slate-700">{ligne.libelle_ligne}</TableCell>
                            <TableCell className="text-right font-mono">
                              {ligne.debit > 0 ? formatMontant(ligne.debit) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {ligne.credit > 0 ? formatMontant(ligne.credit) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-slate-50">
                          <TableCell colSpan={2} className="text-xs">TOTAUX</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatMontant(accountingEntry.total_debit || 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatMontant(accountingEntry.total_credit || 0)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600 bg-white rounded p-2">
                    <div className="flex items-center gap-2">
                      <Badge className={accountingEntry.statut === "valide" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                        {accountingEntry.statut === "valide" ? "Validée" : accountingEntry.statut}
                      </Badge>
                      {accountingEntry.libelle && (
                        <span className="italic">{accountingEntry.libelle}</span>
                      )}
                    </div>
                    {accountingEntry.statut === "brouillon" && (
                      <Button
                        size="sm"
                        onClick={handleValidateEntry}
                        disabled={validatingEntry}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {validatingEntry ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Validation...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valider l'écriture
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
