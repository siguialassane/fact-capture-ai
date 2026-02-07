import { DocumentViewer } from "@/components/desktop/DocumentViewer";
import { InvoiceArticlesList } from "@/components/accounting/InvoiceArticlesList";
import type { FlexibleInvoiceAIResult } from "@/lib/openrouter";
import type { AnalysisStatus } from "@/hooks";

interface DashboardRightPaneProps {
  activeMenuItem: string;
  invoiceData: FlexibleInvoiceAIResult | null;
  onArticleChange: (index: number, field: string, value: string | number) => void;
  pdfUrl: string | null;
  imageUrl: string | null | undefined;
  status: AnalysisStatus;
}

export function DashboardRightPane({
  activeMenuItem,
  invoiceData,
  onArticleChange,
  pdfUrl,
  imageUrl,
  status,
}: DashboardRightPaneProps) {
  if (activeMenuItem === "accounting") {
    return (
      <InvoiceArticlesList
        invoiceData={invoiceData || undefined}
        onArticleChange={onArticleChange}
      />
    );
  }

  return (
    <DocumentViewer
      imageUrl={pdfUrl ? null : (imageUrl || null)}
      pdfUrl={pdfUrl}
      status={status}
    />
  );
}
