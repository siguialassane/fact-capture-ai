import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building, CheckCircle, CreditCard, DollarSign, FileText, Loader2 } from "lucide-react";
import { formatDate, formatMontant } from "./invoices-list.helpers";

interface InvoiceAIData {
  numero_facture?: string;
  date_facture?: string;
  date_echeance?: string;
  fournisseur?: string | { raison_sociale?: string; adresse?: string; telephone?: string };
  adresse_fournisseur?: string;
  telephone_fournisseur?: string;
  total_ht?: number | string;
  total_tva?: number | string;
  montant_total?: number | string;
  articles?: Array<{
    designation?: string;
    quantite?: string;
    prix_unitaire_ht?: string;
    prix_unitaire?: string;
    montant_ht?: string;
    montant_ttc?: string;
    total?: string;
  }>;
}

interface InvoiceDetail {
  image_base64?: string;
  created_at: string;
  ai_result?: InvoiceAIData | null;
}

interface AccountingEntryDetail {
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

interface InvoiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  invoice: InvoiceDetail | null;
  accountingEntry: AccountingEntryDetail | null;
  validatingEntry: boolean;
  onValidateEntry: () => void;
}

export function InvoiceDetailsDialog({
  open,
  onOpenChange,
  loading,
  invoice,
  accountingEntry,
  validatingEntry,
  onValidateEntry,
}: InvoiceDetailsDialogProps) {
  const fournisseurInfo = invoice?.ai_result?.fournisseur;
  const fournisseurAdresse = typeof fournisseurInfo === "object" && fournisseurInfo ? fournisseurInfo.adresse : undefined;
  const fournisseurTelephone = typeof fournisseurInfo === "object" && fournisseurInfo ? fournisseurInfo.telephone : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            Détails de la facture
          </DialogTitle>
          <DialogDescription>
            Facture du {invoice?.created_at ? formatDate(invoice.created_at) : ""}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : invoice ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Image */}
            <div className="col-span-2 lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Image de la facture</CardTitle>
                </CardHeader>
                <CardContent>
                  {invoice.image_base64 ? (
                    <img
                      src={invoice.image_base64}
                      alt="Facture"
                      className="w-full rounded-lg border"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 rounded-lg border border-dashed text-sm text-slate-400">
                      Image en cours de chargement...
                    </div>
                  )}
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
                      {invoice.ai_result?.numero_facture || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Date de facture</div>
                    <div className="font-medium">
                      {invoice.ai_result?.date_facture
                        ? formatDate(invoice.ai_result.date_facture)
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Date d'échéance</div>
                    <div className="font-medium">
                      {invoice.ai_result?.date_echeance
                        ? formatDate(invoice.ai_result.date_echeance)
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
                      {typeof invoice.ai_result?.fournisseur === "string"
                        ? invoice.ai_result?.fournisseur
                        : invoice.ai_result?.fournisseur?.raison_sociale || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Adresse</div>
                    <div className="text-sm">
                      {invoice.ai_result?.adresse_fournisseur ||
                        fournisseurAdresse ||
                        "N/A"}
                    </div>
                  </div>
                  {(invoice.ai_result?.telephone_fournisseur || fournisseurTelephone) && (
                    <div>
                      <div className="text-xs text-slate-500">Téléphone</div>
                      <div className="text-sm">
                        {invoice.ai_result?.telephone_fournisseur || fournisseurTelephone}
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
                      {formatMontant(invoice.ai_result?.total_ht)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">TVA</span>
                    <span className="font-mono font-medium">
                      {formatMontant(invoice.ai_result?.total_tva)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Montant Total</span>
                    <span className="font-mono font-bold text-lg text-violet-600">
                      {formatMontant(invoice.ai_result?.montant_total)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Articles */}
              {invoice.ai_result?.articles && invoice.ai_result.articles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Articles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {invoice.ai_result.articles.map((article, idx) => (
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
                    <span className="font-medium">{accountingEntry.date_piece ? formatDate(accountingEntry.date_piece) : ""}</span>
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
                    <Badge className={accountingEntry.statut === "valide" || accountingEntry.statut === "validee" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                      {accountingEntry.statut === "valide" || accountingEntry.statut === "validee" ? "Validée" : accountingEntry.statut}
                    </Badge>
                    {accountingEntry.libelle && (
                      <span className="italic">{accountingEntry.libelle}</span>
                    )}
                  </div>
                  {accountingEntry.statut === "brouillon" && (
                    <Button
                      size="sm"
                      onClick={onValidateEntry}
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
  );
}
