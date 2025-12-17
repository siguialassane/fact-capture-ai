import { FileSpreadsheet, FileDown, Building2, Calendar, Hash, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EditableField } from "@/components/ui/editable-field";
import { ArticlesTable } from "./ArticlesTable";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface InvoiceDataPanelProps {
  status: "waiting" | "analyzing" | "complete" | "error";
  data: {
    fournisseur: string;
    montant_total: string;
    date_facture: string;
    numero_facture: string;
    tva: string;
    articles: {
      designation: string;
      quantite: string;
      prix_unitaire: string;
      total: string;
    }[];
  };
  onDataChange: (field: string, value: string) => void;
  onArticleChange: (index: number, field: string, value: string) => void;
}

export function InvoiceDataPanel({
  status,
  data,
  onDataChange,
  onArticleChange,
}: InvoiceDataPanelProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "waiting":
        return <StatusBadge variant="pending">En attente</StatusBadge>;
      case "analyzing":
        return <StatusBadge variant="analyzing">Analyse en cours...</StatusBadge>;
      case "complete":
        return <StatusBadge variant="success">Analysé</StatusBadge>;
      case "error":
        return <StatusBadge variant="error">Erreur</StatusBadge>;
    }
  };

  const isReady = status === "complete";

  return (
    <div className="h-screen flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Receipt className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">DONNÉES EXTRAITES</h2>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!isReady}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!isReady}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {status === "waiting" && (
          <div className="flex items-center justify-center h-full animate-in">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Les données apparaîtront ici après l'analyse
              </p>
            </div>
          </div>
        )}

        {status === "analyzing" && (
          <div className="flex items-center justify-center h-full animate-in">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">
                Analyse IA en cours...
              </p>
              <p className="text-sm text-muted-foreground">
                Extraction des données de la facture
              </p>
            </div>
          </div>
        )}

        {(status === "complete" || status === "error") && (
          <div className="space-y-6 animate-in">
            {/* Main info cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Amount - Highlighted */}
              <div className="col-span-2 bg-primary/5 rounded-xl p-4 border border-primary/20">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Receipt className="h-4 w-4" />
                  Montant Total TTC
                </div>
                <div className="text-3xl font-bold text-primary">
                  <EditableField
                    value={data.montant_total}
                    onSave={(val) => onDataChange("montant_total", val)}
                    className="text-3xl font-bold"
                  />
                </div>
              </div>

              {/* Supplier */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Building2 className="h-4 w-4" />
                  Fournisseur
                </div>
                <EditableField
                  value={data.fournisseur}
                  onSave={(val) => onDataChange("fournisseur", val)}
                  className="font-medium"
                />
              </div>

              {/* Date */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Date de facture
                </div>
                <EditableField
                  value={data.date_facture}
                  onSave={(val) => onDataChange("date_facture", val)}
                  className="font-medium"
                />
              </div>

              {/* Invoice number */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Hash className="h-4 w-4" />
                  Numéro de facture
                </div>
                <EditableField
                  value={data.numero_facture}
                  onSave={(val) => onDataChange("numero_facture", val)}
                  className="font-medium font-mono"
                />
              </div>

              {/* TVA */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Receipt className="h-4 w-4" />
                  TVA
                </div>
                <EditableField
                  value={data.tva}
                  onSave={(val) => onDataChange("tva", val)}
                  className="font-medium"
                />
              </div>
            </div>

            {/* Articles table */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Articles
              </h3>
              <ArticlesTable
                articles={data.articles}
                onArticleChange={onArticleChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
