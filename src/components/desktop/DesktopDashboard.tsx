import { useState, useEffect, useCallback } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DocumentViewer } from "./DocumentViewer";
import { InvoiceDataPanel } from "./InvoiceDataPanel";
import { type ChatMessage } from "./InvoiceChatInline";
import { getLatestInvoice, type InvoiceData } from "@/lib/db";
import {
  getLatestInvoiceFromSupabase,
  getInvoiceById,
  subscribeToInvoices,
  updateInvoiceAIResult,
  saveInvoiceToSupabase,
  requestPhotoFromPWA,
  type InvoiceRecord,
} from "@/lib/supabase";
import {
  analyzeInvoiceImage,
  analyzePDFDocument,
  chatWithInvoiceContext,
  isOpenRouterConfigured,
  type FlexibleInvoiceAIResult,
  type ChatContext
} from "@/lib/openrouter";
import { fileToBase64 } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

type AnalysisStatus = "waiting" | "analyzing" | "complete" | "error" | "not_invoice";

const emptyInvoiceData: FlexibleInvoiceAIResult = {
  is_invoice: false,
  type_document: "",
  fournisseur: "",
  montant_total: "",
  date_facture: "",
  numero_facture: "",
  tva: "",
  articles: [],
  ai_comment: "",
};

export function DesktopDashboard() {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [supabaseInvoice, setSupabaseInvoice] = useState<InvoiceRecord | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>("waiting");
  const [invoiceData, setInvoiceData] = useState<FlexibleInvoiceAIResult | null>(null);
  const [activeMenuItem, setActiveMenuItem] = useState("dashboard");
  const { toast } = useToast();

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  // PWA sync state
  const [isWaitingForPWA, setIsWaitingForPWA] = useState(false);

  // PDF state (to display PDF natively)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Process invoice from Supabase
  const processSupabaseInvoice = useCallback(async (record: InvoiceRecord) => {
    setSupabaseInvoice(record);
    setIsWaitingForPWA(false); // Photo received, stop waiting

    const isPdf = record.image_base64?.startsWith("data:application/pdf");

    setPdfUrl(isPdf && record.image_base64 ? record.image_base64 : null);

    setInvoice({
      id: record.id || 1,
      image: record.image_base64 || "",
      createdAt: new Date(record.created_at || Date.now()),
      analyzed: Boolean(record.ai_result),
    });

    if (record.ai_result) {
      const result = record.ai_result as FlexibleInvoiceAIResult;
      setInvoiceData(result);
      if (result.is_invoice === false) {
        setStatus("not_invoice");
      } else {
        setStatus("complete");
      }
      return;
    }

    if (record.image_base64 && isOpenRouterConfigured()) {
      setStatus("analyzing");

      const aiResult = await analyzeInvoiceImage(record.image_base64);

      if (aiResult) {
        setInvoiceData(aiResult);

        if (aiResult.is_invoice === false) {
          setStatus("not_invoice");
          toast({
            title: "Document non reconnu",
            description: "Ce document ne semble pas être une facture.",
            variant: "destructive",
          });
        } else {
          setStatus("complete");
          toast({
            title: "Analyse terminée",
            description: `${aiResult.type_facture ? `Facture ${aiResult.type_facture}` : "Facture"} analysée avec succès.`,
          });
        }

        if (record.id) {
          await updateInvoiceAIResult(record.id, aiResult);
        }
      } else {
        setStatus("error");
        toast({
          title: "Erreur d'analyse",
          description: "Impossible d'analyser le document.",
          variant: "destructive",
        });
      }
    } else {
      setStatus("waiting");
    }
  }, [toast]);

  // Load initial data
  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const supabaseRecord = await getLatestInvoiceFromSupabase();

        if (supabaseRecord) {
          await processSupabaseInvoice(supabaseRecord);
          return;
        }

        const latestInvoice = await getLatestInvoice();
        if (latestInvoice) {
          setInvoice(latestInvoice);
          if (latestInvoice.data) {
            setInvoiceData(latestInvoice.data as unknown as FlexibleInvoiceAIResult);
            setStatus("complete");
          } else {
            setStatus("waiting");
          }
          return;
        }

        setStatus("waiting");
      } catch (error) {
        console.error("Error loading invoice:", error);
        setStatus("waiting");
      }
    };

    loadInvoice();
  }, [processSupabaseInvoice]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = subscribeToInvoices(async (payload) => {
      if (payload.new && payload.new.id) {
        toast({
          title: "Nouvelle facture détectée",
          description: "Téléchargement de l'image...",
        });

        // Fetch full record to ensure we have the complete image_base64
        // Realtime payload might truncate large fields
        const fullRecord = await getInvoiceById(payload.new.id);

        if (fullRecord) {
          await processSupabaseInvoice(fullRecord);
          toast({
            title: "Facture reçue",
            description: "Analyse en cours...",
          });
        }
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [processSupabaseInvoice, toast]);

  // Handle new invoice (reset)
  const handleNewInvoice = () => {
    setInvoice(null);
    setSupabaseInvoice(null);
    setInvoiceData(null);
    setPdfUrl(null);
    setStatus("waiting");
    // Reset chat
    setChatMessages([]);
    setConversationHistory([]);
    toast({
      title: "Prêt pour une nouvelle facture",
      description: "Importez un fichier ou attendez un scan depuis le mobile.",
    });
  };

  // Handle file upload (image or PDF)
  const handleFileUpload = async (file: File) => {
    try {
      setStatus("analyzing");
      // Reset chat for new document
      setChatMessages([]);
      setConversationHistory([]);

      const base64 = await fileToBase64(file);

      // For PDFs, keep the PDF URL for native display
      if (file.type === "application/pdf") {
        setPdfUrl(base64);
      } else {
        setPdfUrl(null);
      }

      setInvoice({
        id: Date.now(),
        image: base64,
        createdAt: new Date(),
        analyzed: false,
      });

      let aiResult: FlexibleInvoiceAIResult | null = null;

      if (file.type === "application/pdf") {
        aiResult = await analyzePDFDocument(base64);
      } else {
        aiResult = await analyzeInvoiceImage(base64);
      }

      if (aiResult) {
        setInvoiceData(aiResult);

        // Save to Supabase
        await saveInvoiceToSupabase(base64, aiResult);

        if (aiResult.is_invoice === false) {
          setStatus("not_invoice");
          toast({
            title: "Document non reconnu",
            description: aiResult.ai_comment || "Ce document ne semble pas être une facture.",
            variant: "destructive",
          });
        } else {
          setStatus("complete");
          toast({
            title: "Analyse terminée",
            description: `${aiResult.type_facture ? `Facture de type "${aiResult.type_facture}"` : "Facture"} analysée avec succès.`,
          });
        }
      } else {
        setStatus("error");
        toast({
          title: "Erreur",
          description: "Impossible d'analyser ce fichier.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("File upload error:", error);
      setStatus("error");
      toast({
        title: "Erreur",
        description: "Erreur lors du traitement du fichier.",
        variant: "destructive",
      });
    }
  };

  const handleDataChange = (field: string, value: string) => {
    if (!invoiceData) return;

    // Special handling for extra_fields (passed as JSON string)
    if (field === "extra_fields") {
      try {
        const parsedExtraFields = JSON.parse(value);
        setInvoiceData((prev) => prev ? ({
          ...prev,
          extra_fields: parsedExtraFields,
        }) : null);
      } catch {
        console.error("Invalid JSON for extra_fields");
      }
      return;
    }

    setInvoiceData((prev) => prev ? ({
      ...prev,
      [field]: value,
    }) : null);
  };

  const handleArticleChange = (
    index: number,
    field: string,
    value: string
  ) => {
    if (!invoiceData) return;
    setInvoiceData((prev) => prev ? ({
      ...prev,
      articles: prev.articles.map((article, i) =>
        i === index ? { ...article, [field]: value } : article
      ),
    }) : null);
  };

  // Handle chat message
  const handleChatMessage = async (message: string, forceReanalyze: boolean = false): Promise<string> => {
    if (!invoiceData) {
      throw new Error("No invoice data");
    }

    setIsChatLoading(true);

    try {
      const context: ChatContext = {
        invoiceData,
        imageBase64: invoice?.image || null,
        conversationHistory,
      };

      const response = await chatWithInvoiceContext(message, context, forceReanalyze);

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: "user" as const, content: message },
        { role: "assistant" as const, content: response },
      ]);

      return response;
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle data regeneration from chat
  const handleRegenerateData = (newData: FlexibleInvoiceAIResult) => {
    setInvoiceData(newData);

    // Update in Supabase if we have a record
    if (supabaseInvoice?.id) {
      updateInvoiceAIResult(supabaseInvoice.id, newData);
    }

    toast({
      title: "Données mises à jour",
      description: "Le tableau a été mis à jour selon vos instructions.",
    });
  };

  // Handle request photo from PWA
  const handleRequestPhotoFromPWA = async () => {
    setIsWaitingForPWA(true);
    const session = await requestPhotoFromPWA();
    if (session) {
      toast({
        title: "📱 En attente de photo",
        description: "Prenez une photo sur votre mobile pour la synchroniser.",
      });
    } else {
      setIsWaitingForPWA(false);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session. Vérifiez votre connexion.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar
        activeItem={activeMenuItem}
        onItemClick={setActiveMenuItem}
      />

      <div className="flex-1 flex">
        <div className="flex-1 border-r border-border">
          <InvoiceDataPanel
            status={status}
            data={invoiceData}
            imageUrl={invoice?.image}
            onDataChange={handleDataChange}
            onArticleChange={handleArticleChange}
            onNewInvoice={handleNewInvoice}
            onFileUpload={handleFileUpload}
            onRequestPhotoFromPWA={handleRequestPhotoFromPWA}
            isWaitingForPWA={isWaitingForPWA}
            onSendChatMessage={status === "complete" && invoiceData ? handleChatMessage : undefined}
            onRegenerateChatData={handleRegenerateData}
            isChatLoading={isChatLoading}
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
          />
        </div>

        <div className="w-[45%]">
          <DocumentViewer
            imageUrl={pdfUrl ? null : (invoice?.image || null)}
            pdfUrl={pdfUrl}
            status={status}
          />
        </div>
      </div>
    </div>
  );
}
