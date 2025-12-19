import { useState, useRef } from "react";
import {
  FileSpreadsheet,
  FileDown,
  Building2,
  Calendar,
  Hash,
  Receipt,
  Image,
  Plus,
  Upload,
  AlertTriangle,
  MessageSquare,
  FileText,
  Tag,
  Info,
  Camera,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EditableField } from "@/components/ui/editable-field";
import { ArticlesTable } from "./ArticlesTable";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { InvoiceChatInline, type ChatMessage } from "./InvoiceChatInline";
import { exportToPDF, exportToExcel, downloadImage } from "@/lib/export-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { FlexibleInvoiceAIResult } from "@/lib/openrouter";

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
          {/* Nouvelle facture - Dialog avec 2 options */}
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-violet-300 text-violet-600 hover:bg-violet-50 hover:text-violet-700"
              >
                <Plus className="h-4 w-4" />
                Nouvelle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center text-xl">Nouvelle facture</DialogTitle>
                <DialogDescription className="text-center">
                  Choisissez comment ajouter votre facture
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-6">
                {/* Option 1: Importer depuis l'ordinateur */}
                <button
                  onClick={() => {
                    setShowNewDialog(false);
                    onNewInvoice();
                    setTimeout(() => fileInputRef.current?.click(), 100);
                  }}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-400 transition-all group"
                >
                  <div className="p-4 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <FolderOpen className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-blue-700">Importer</p>
                    <p className="text-xs text-blue-600/70 mt-1">
                      Depuis l'ordinateur
                    </p>
                  </div>
                </button>

                {/* Option 2: Attendre une photo PWA */}
                <button
                  onClick={() => {
                    setShowNewDialog(false);
                    onNewInvoice();
                    onRequestPhotoFromPWA?.();
                  }}
                  className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed transition-all group ${isWaitingForPWA
                    ? "border-green-400 bg-green-50 animate-pulse"
                    : "border-orange-300 bg-orange-50/50 hover:bg-orange-100 hover:border-orange-400"
                    }`}
                >
                  <div className={`p-4 rounded-full transition-colors ${isWaitingForPWA
                    ? "bg-green-200"
                    : "bg-orange-100 group-hover:bg-orange-200"
                    }`}>
                    <Camera className={`h-8 w-8 ${isWaitingForPWA ? "text-green-600" : "text-orange-600"}`} />
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold ${isWaitingForPWA ? "text-green-700" : "text-orange-700"}`}>
                      {isWaitingForPWA ? "En attente..." : "Appareil photo"}
                    </p>
                    <p className={`text-xs mt-1 ${isWaitingForPWA ? "text-green-600/70" : "text-orange-600/70"}`}>
                      {isWaitingForPWA ? "Prenez une photo sur le mobile" : "Scanner via mobile"}
                    </p>
                  </div>
                </button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Formats acceptés : Images (JPG, PNG) et PDF
              </p>
            </DialogContent>
          </Dialog>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Importer un fichier"
          />

          <Button
            variant="outline"
            size="sm"
            disabled={!imageUrl}
            onClick={handleDownloadImage}
            className="gap-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
          >
            <Image className="h-4 w-4" />
            Image
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={!isReady || isExporting}
            onClick={handleExportPDF}
            className="gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={!isReady}
            onClick={handleExportExcel}
            className="gap-2 border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
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
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center mx-auto mb-6">
                <Receipt className="h-10 w-10 text-violet-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                En attente d'une facture
              </h3>
              <p className="text-muted-foreground mb-6">
                Scannez une facture depuis le mobile ou importez un fichier (Image, PDF)
              </p>
              <Button variant="outline" onClick={handleUploadClick} className="gap-2">
                <Upload className="h-4 w-4" />
                Importer un fichier
              </Button>
            </div>
          </div>
        )}

        {status === "analyzing" && (
          <div className="flex items-center justify-center h-full animate-in">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">Analyse IA en cours...</p>
              <p className="text-sm text-muted-foreground">Extraction et validation du document</p>
            </div>
          </div>
        )}

        {status === "not_invoice" && data && (
          <div className="flex items-center justify-center h-full animate-in">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-10 w-10 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Document non reconnu</h3>
              <p className="text-muted-foreground mb-4">Ce document ne semble pas être une facture.</p>
              {data.ai_comment && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left mb-4">
                  <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                    <MessageSquare className="h-4 w-4" />
                    Commentaire IA
                  </div>
                  <p className="text-sm text-amber-800">{data.ai_comment}</p>
                </div>
              )}
              <Button variant="outline" onClick={onNewInvoice}>
                <Plus className="h-4 w-4 mr-2" />
                Essayer une autre facture
              </Button>
            </div>
          </div>
        )}

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

            {/* Main info cards */}
            {/* Main info cards - Clean Dashboard Style */}
            <div className="grid grid-cols-2 gap-4">
              {/* Montant Total - Hero Card */}
              <div className="col-span-2 p-6 rounded-2xl bg-white border border-violet-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute -right-6 -top-6 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rotate-12">
                  <Receipt className="w-40 h-40 text-violet-900" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-violet-600/80 uppercase tracking-wider">Montant Net à Payer</p>
                    {data.devise_origine && data.devise_origine !== "XOF" && (
                      <span className="text-xs font-bold bg-violet-50 text-violet-700 px-2.5 py-1 rounded-md border border-violet-100">
                        Devise: {data.devise_origine}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <EditableField
                      value={data.montant_total}
                      onSave={(val) => onDataChange("montant_total", val)}
                      className="text-4xl font-bold text-slate-800 tracking-tight"
                    />
                  </div>
                  {data.montant_fcfa && (
                    <div className="mt-2 text-sm font-medium text-emerald-600 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      Soit {data.montant_fcfa} FCFA
                    </div>
                  )}
                </div>
              </div>

              {/* Fournisseur */}
              <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-violet-200 transition-colors group">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fournisseur</span>
                </div>
                <EditableField
                  value={data.fournisseur}
                  onSave={(val) => onDataChange("fournisseur", val)}
                  className="font-semibold text-slate-700 text-lg truncate block"
                />
              </div>

              {/* Date */}
              <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-violet-200 transition-colors group">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</span>
                </div>
                <EditableField
                  value={data.date_facture}
                  onSave={(val) => onDataChange("date_facture", val)}
                  className="font-medium text-slate-700"
                />
              </div>

              {/* Facture N° */}
              <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-violet-200 transition-colors group">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 group-hover:text-purple-700 transition-colors">
                    <Hash className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">N° Pièce</span>
                </div>
                <EditableField
                  value={data.numero_facture}
                  onSave={(val) => onDataChange("numero_facture", val)}
                  className="font-mono font-medium text-slate-700"
                />
              </div>

              {/* TVA / Taxes */}
              <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-violet-200 transition-colors group">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-colors">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">TVA Globale</span>
                </div>
                <EditableField
                  value={data.tva}
                  onSave={(val) => onDataChange("tva", val)}
                  className="font-medium text-slate-700"
                />
              </div>
            </div>

            {/* Extra Fields */}
            {data.extra_fields && Object.keys(data.extra_fields).length > 0 && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Informations supplémentaires
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(data.extra_fields).map(([key, value]) => (
                    <div key={key} className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="text-sm font-semibold text-blue-700 mb-1 capitalize">
                        {key.replace(/_/g, " ")}
                      </div>
                      <EditableField
                        value={value}
                        onSave={(val) => {
                          // Update extra_fields
                          const newExtraFields = { ...data.extra_fields, [key]: val };
                          onDataChange("extra_fields", JSON.stringify(newExtraFields));
                        }}
                        className="font-medium text-slate-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* AI Comment */}
            {data.ai_comment && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                <h3 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Commentaire IA
                </h3>
                <p className="text-amber-800 text-sm leading-relaxed">{data.ai_comment}</p>
              </div>
            )}

            {/* Anomalies */}
            {data.anomalies && data.anomalies.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Anomalies détectées
                </h3>
                <ul className="space-y-1">
                  {data.anomalies.map((anomaly, index) => (
                    <li key={index} className="text-red-700 text-sm flex items-start gap-2">
                      <span className="text-red-400">•</span>
                      {anomaly}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Chat IA Inline - Intégré en bas de l'analyse */}
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
