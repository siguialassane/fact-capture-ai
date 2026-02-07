import { AccountingEntryView } from "@/components/accounting";
import { PaymentStatusSelector } from "@/components/desktop/PaymentStatusSelector";
import { InvoiceDataPanel } from "@/components/desktop/InvoiceDataPanel";
import type { FlexibleInvoiceAIResult } from "@/lib/openrouter";
import type { AccountingStatus, JournalEntry, StatutPaiement } from "@/lib/api/backend-client";
import type { AnalysisStatus } from "@/hooks";
import type { ChatMessage } from "@/hooks/useInvoiceChat";

interface DashboardLeftPaneProps {
  activeMenuItem: string;
  showPaymentSelector: boolean;
  invoiceData: FlexibleInvoiceAIResult | null;
  accountingEntry: JournalEntry | null;
  accountingStatus: AccountingStatus;
  accountingReasoning?: { thinking_content: string; duration_ms?: number };
  accountingSuggestions: string[];
  confirmedPaymentStatus?: StatutPaiement;
  confirmedPartialAmount?: number;
  onPaymentConfirm: (status: StatutPaiement, partialAmount?: number) => void;
  onRegeneratePaymentStatus: () => void;
  onRegenerateWithStatus: (status: StatutPaiement, partialAmount?: number) => void;
  onRefine: (feedback: string) => void;
  onSave: () => void;
  onChat: (message: string, entry: JournalEntry) => Promise<string>;
  isSaving: boolean;
  isSaved: boolean;
  status: AnalysisStatus;
  imageUrl: string | null | undefined;
  onDataChange: (path: string, value: string | number) => void;
  onArticleChange: (index: number, field: string, value: string | number) => void;
  onNewInvoice: () => void;
  onFileUpload: (file: File) => Promise<void>;
  onRequestPhotoFromPWA: () => Promise<void>;
  isWaitingForPWA: boolean;
  onSendChatMessage?: (message: string, forceReanalyze?: boolean) => Promise<string>;
  onRegenerateChatData: (newData: FlexibleInvoiceAIResult) => void;
  isChatLoading: boolean;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export function DashboardLeftPane({
  activeMenuItem,
  showPaymentSelector,
  invoiceData,
  accountingEntry,
  accountingStatus,
  accountingReasoning,
  accountingSuggestions,
  confirmedPaymentStatus,
  confirmedPartialAmount,
  onPaymentConfirm,
  onRegeneratePaymentStatus,
  onRegenerateWithStatus,
  onRefine,
  onSave,
  onChat,
  isSaving,
  isSaved,
  status,
  imageUrl,
  onDataChange,
  onArticleChange,
  onNewInvoice,
  onFileUpload,
  onRequestPhotoFromPWA,
  isWaitingForPWA,
  onSendChatMessage,
  onRegenerateChatData,
  isChatLoading,
  chatMessages,
  setChatMessages,
}: DashboardLeftPaneProps) {
  const paymentInfo = invoiceData as (FlexibleInvoiceAIResult & {
    statut_paiement_suggere?: string;
    indices_paiement?: string[];
    mode_paiement?: string;
    montant_total?: number | string;
  }) | null;

  if (activeMenuItem === "accounting") {
    if (showPaymentSelector && invoiceData) {
      return (
        <div className="h-full overflow-auto p-6 bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center">
          <div className="w-full max-w-xl">
            <PaymentStatusSelector
              suggestedStatus={paymentInfo?.statut_paiement_suggere || "inconnu"}
              paymentIndices={paymentInfo?.indices_paiement || []}
              paymentMode={paymentInfo?.mode_paiement}
              totalAmount={(() => {
                const mt = paymentInfo?.montant_total;
                if (typeof mt === "number") return mt;
                if (typeof mt === "string") return Number(mt.replace(/[^0-9.,]/g, "").replace(",", ".")) || undefined;
                return undefined;
              })()}
              onConfirm={onPaymentConfirm}
            />
          </div>
        </div>
      );
    }

    return (
      <AccountingEntryView
        entry={accountingEntry}
        status={accountingStatus}
        reasoning={accountingReasoning}
        suggestions={accountingSuggestions}
        invoiceData={invoiceData || undefined}
        confirmedStatus={confirmedPaymentStatus}
        confirmedPartialAmount={confirmedPartialAmount}
        onRefine={onRefine}
        onSave={onSave}
        onChat={onChat}
        isSaving={isSaving}
        isSaved={isSaved}
        onRegenerate={onRegeneratePaymentStatus}
        onRegenerateWithStatus={onRegenerateWithStatus}
      />
    );
  }

  return (
    <InvoiceDataPanel
      status={status}
      data={invoiceData}
      imageUrl={imageUrl}
      onDataChange={onDataChange}
      onArticleChange={onArticleChange}
      onNewInvoice={onNewInvoice}
      onFileUpload={onFileUpload}
      onRequestPhotoFromPWA={onRequestPhotoFromPWA}
      isWaitingForPWA={isWaitingForPWA}
      onSendChatMessage={onSendChatMessage}
      onRegenerateChatData={onRegenerateChatData}
      isChatLoading={isChatLoading}
      chatMessages={chatMessages}
      setChatMessages={setChatMessages}
    />
  );
}
