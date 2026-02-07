/**
 * Vue Liste des Factures
 *
 * Affiche toutes les factures enregistrées avec possibilité de voir les détails
 */

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Search,
  Loader2,
  Eye,
  Trash2,
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
import { InvoiceDetailsDialog } from "./InvoiceDetailsDialog";
import { formatDate, formatMontant, getFournisseurName, getLatestEntry } from "./invoices-list.helpers";
import { backendApi, getInvoice, deleteInvoice } from "@/lib/api/backend-client";
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
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [accountingEntry, setAccountingEntry] = useState<JournalEntryWithInvoice | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [validatingEntry, setValidatingEntry] = useState(false);

  // Charger les factures avec cache
  const { data: invoicesRaw = { invoices: [] }, isLoading: loading, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices-with-entries'],
    queryFn: () => backendApi.getInvoicesWithEntries(100, 0),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Filtrer uniquement les factures validées
  const invoices = invoicesRaw.invoices.filter((inv: Invoice) => {
    const latest = getLatestEntry(inv);
    return latest?.statut === "valide" || latest?.statut === "validee";
  });

  // Fonction pour recharger les factures
  async function loadInvoices() {
    queryClient.invalidateQueries({ queryKey: ['invoices-with-entries'] });
  }

  // Voir les détails d'une facture
  async function viewInvoiceDetails(id: string) {
    setLoadingDetail(true);
    setShowDetailDialog(true);
    setAccountingEntry(null); // Reset accounting entry
    try {
      console.log(`[InvoicesList] Ouverture détail facture ${id}`);
      const invoiceInList = invoices.find((inv) => inv.id === id);
      if (invoiceInList) {
        setSelectedInvoice({
          id: invoiceInList.id,
          image_base64: "",
          ai_result: invoiceInList.ai_result,
          created_at: invoiceInList.created_at,
        });
      }

      const [invoice, entries] = await Promise.all([
        getInvoice(id),
        backendApi.getAccountingEntriesByInvoice(id),
      ]);

      if (invoice) {
        setSelectedInvoice(invoice);
      }

      if (entries.length > 0) {
        const sorted = [...entries].sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || a.date_piece || 0).getTime();
          const dateB = new Date(b.created_at || b.date_piece || 0).getTime();
          return dateB - dateA;
        });
        setAccountingEntry(sorted[0] as JournalEntryWithInvoice);
        console.log("[InvoicesList] Écriture complète chargée", (sorted[0] as any).id);
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
        const fournisseurNom = getFournisseurName(result);
        return (
          result.numero_facture?.toLowerCase().includes(searchLower) ||
          fournisseurNom.toLowerCase().includes(searchLower) ||
          result.montant_total?.toString().includes(searchLower)
        );
      })
    : invoices;



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
                    const fournisseurNom = getFournisseurName(result);
                    const latestEntry = getLatestEntry(invoice);
                    return (
                      <TableRow key={invoice.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-sm text-violet-600 font-medium">
                          {result?.numero_facture || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[280px]">
                            <div className="font-medium text-slate-800 truncate">
                              {fournisseurNom || "Non renseigné"}
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
                                latestEntry.statut === "valide" || latestEntry.statut === "validee"
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

      <InvoiceDetailsDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        loading={loadingDetail}
        invoice={selectedInvoice}
        accountingEntry={accountingEntry}
        validatingEntry={validatingEntry}
        onValidateEntry={handleValidateEntry}
      />
    </div>
  );
}
