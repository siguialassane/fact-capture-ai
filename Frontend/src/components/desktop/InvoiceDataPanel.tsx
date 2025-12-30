/**
 * InvoiceDataPanel - Panneau principal d'affichage des données de facture
 * 
 * REFACTORISÉ: Les sous-composants sont dans ./invoice/
 */

import { useState, useRef } from "react";
import { FileSpreadsheet, FileText, Tag } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArticlesTable } from "./ArticlesTable";
import { InvoiceChatInline, type ChatMessage } from "./InvoiceChatInline";
import { exportToPDF, exportToExcel, downloadImage } from "@/lib/export-utils";
import type { FlexibleInvoiceAIResult } from "@/lib/openrouter";

// Import des sous-composants
import {
  InvoiceHeader,
  InvoiceStatusStates,
  InvoiceMainCards,
  InvoiceAddresses,
  InvoiceExtraInfos,
} from "./invoice";

interface InvoiceDataPanelProps {
  status: "waiting" | "analyzing" | "complete" | "error" | "not_invoice";
  data: FlexibleInvoiceAIResult | null;
  imageUrl?: string | null;
  onDataChange: (field: string, value: string) => void;
  onArticleChange: (index: number, field: string, value: string) => void;
  onNewInvoice: () => void;
  onFileUpload: (file: File) => void;
  onRequestPhotoFromPWA?: () => void;
  isWaitingForPWA?: boolean;
  // Chat inline props
  onSendChatMessage?: (message: string, forceReanalyze?: boolean) => Promise<string>;
  onRegenerateChatData?: (newData: FlexibleInvoiceAIResult) => void;
  isChatLoading?: boolean;
  chatMessages?: ChatMessage[];
  setChatMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export function InvoiceDataPanel({
  status,
  data,
  imageUrl,
  onDataChange,
  onArticleChange,
  onNewInvoice,
  onFileUpload,
  onRequestPhotoFromPWA,
  isWaitingForPWA = false,
  onSendChatMessage,
  onRegenerateChatData,
  isChatLoading = false,
  chatMessages = [],
  setChatMessages,
}: InvoiceDataPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const getStatusBadge = () => {
    switch (status) {
      case "waiting":
        return <StatusBadge variant="pending">En attente</StatusBadge>;
      case "analyzing":
        return <StatusBadge variant="analyzing">Analyse en cours...</StatusBadge>;
      case "complete":
        return <StatusBadge variant="success">Analysé</StatusBadge>;
      case "not_invoice":
        return <StatusBadge variant="error">Non reconnu</StatusBadge>;
      case "error":
        return <StatusBadge variant="error">Erreur</StatusBadge>;
    }
  };

  const isReady = status === "complete" && data;

  const handleExportPDF = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      await exportToPDF({
        ...data,
        extra_fields: data.extra_fields,
        ai_comment: data.ai_comment,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (!data) return;
    exportToExcel({
      ...data,
      extra_fields: data.extra_fields,
      ai_comment: data.ai_comment,
    });
  };

  const handleDownloadImage = () => {
    if (!imageUrl) return;
    downloadImage(imageUrl, `facture_${data?.numero_facture || Date.now()}.jpg`);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="h-screen flex flex-col bg-card">
      {/* Header avec boutons d'export */}
      <InvoiceHeader
        statusBadge={getStatusBadge()}
        isReady={!!isReady}
        isExporting={isExporting}
        imageUrl={imageUrl}
        showNewDialog={showNewDialog}
        setShowNewDialog={setShowNewDialog}
        isWaitingForPWA={isWaitingForPWA}
        onNewInvoice={onNewInvoice}
        onFileUpload={onFileUpload}
        onRequestPhotoFromPWA={onRequestPhotoFromPWA}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onDownloadImage={handleDownloadImage}
      />

      {/* Hidden file input (pour que InvoiceHeader puisse y accéder via ref) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileUpload(file);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        className="hidden"
        aria-label="Importer un fichier"
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* États de statut (waiting, analyzing, not_invoice) */}
        <InvoiceStatusStates
          status={status}
          data={data}
          onNewInvoice={onNewInvoice}
          onUploadClick={handleUploadClick}
        />

        {/* Contenu principal quand la facture est analysée */}
        {(status === "complete" || status === "error") && data && data.is_invoice && (
          <div className="space-y-6 animate-in">
            {/* Document Type Badges */}
            {(data.type_document || data.type_facture) && (
              <div className="flex items-center gap-3 flex-wrap">
                {data.type_document && data.type_document !== "non_identifié" && (
                  <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full text-sm font-medium">
                    <FileText className="h-3.5 w-3.5" />
                    {data.type_document}
                  </div>
                )}
                {data.type_facture && (
                  <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                    <Tag className="h-3.5 w-3.5" />
                    {data.type_facture}
                  </div>
                )}
              </div>
            )}

            {/* Cartes d'informations principales */}
            <InvoiceMainCards data={data} onDataChange={onDataChange} />

            {/* Section Adresses */}
            <InvoiceAddresses data={data} onDataChange={onDataChange} />

            {/* Sections d'informations supplémentaires */}
            <InvoiceExtraInfos data={data} onDataChange={onDataChange} />

            {/* Articles table */}
            {data.articles && data.articles.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Articles
                </h3>
                <ArticlesTable
                  articles={data.articles}
                  onArticleChange={onArticleChange}
                  totalHT={data.total_ht}
                  totalTVA={data.total_tva || data.tva}
                  totalTTC={data.montant_total}
                />
              </div>
            )}

            {/* Chat IA Inline */}
            {onSendChatMessage && onRegenerateChatData && setChatMessages && (
              <InvoiceChatInline
                invoiceData={data}
                onSendMessage={onSendChatMessage}
                onRegenerateData={onRegenerateChatData}
                isLoading={isChatLoading}
                messages={chatMessages}
                setMessages={setChatMessages}
                hasImage={!!imageUrl}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
