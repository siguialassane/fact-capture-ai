import { useEffect, useCallback } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DocumentViewer } from "./DocumentViewer";
import { InvoiceDataPanel } from "./InvoiceDataPanel";
import { AccountingEntryView } from "@/components/accounting";
import { JournauxView } from "@/components/journals";
import { GrandLivreView } from "@/components/grand-livre";
import { LettrageView } from "@/components/lettrage";
import { EtatsFinanciersView } from "@/components/etats-financiers";
import { getLatestInvoice } from "@/lib/db";
import { isOpenRouterConfigured, type FlexibleInvoiceAIResult } from "@/lib/openrouter";
import {
  generateAccountingEntry,
  refineAccountingEntry,
  saveAccountingEntry,
  chatAboutEntry,
  type JournalEntry,
  type AccountingStatus,
} from "@/lib/accounting-api";
import {
  useInvoiceAnalysis,
  useInvoiceChat,
  useSupabaseSync,
  useToast,
} from "@/hooks";
import { useState } from "react";

export function DesktopDashboard() {
  const { toast } = useToast();
  const [activeMenuItem, setActiveMenuItem] = useState("dashboard");

  // Accounting state
  const [accountingStatus, setAccountingStatus] = useState<AccountingStatus>("idle");
  const [accountingEntry, setAccountingEntry] = useState<JournalEntry | null>(null);
  const [accountingReasoning, setAccountingReasoning] = useState<{
    thinking_content: string;
    duration_ms?: number;
  } | undefined>(undefined);
  const [accountingSuggestions, setAccountingSuggestions] = useState<string[]>([]);
  const [isSavingAccounting, setIsSavingAccounting] = useState(false);
  const [isAccountingSaved, setIsAccountingSaved] = useState(false);

  // Analysis hook
  const {
    status,
    setStatus,
    invoiceData,
    setInvoiceData,
    analyzeImage,
    analyzeFile,
    updateData,
    updateArticle,
    resetAnalysis,
  } = useInvoiceAnalysis();

  // Chat hook
  const {
    chatMessages,
    setChatMessages,
    isChatLoading,
    conversationHistory,
    sendMessage,
    regenerateData,
    resetChat,
  } = useInvoiceChat({
    onDataRegenerated: setInvoiceData,
  });

  // Function to generate accounting entry
  const generateAccounting = useCallback(async (data: FlexibleInvoiceAIResult) => {
    if (!data.is_invoice) return;
    
    console.log("[Accounting] Démarrage de la génération d'écriture comptable...");
    setAccountingStatus("generating");
    
    try {
      const result = await generateAccountingEntry(data as Record<string, unknown>);
      
      if (result.success && result.data) {
        setAccountingEntry(result.data.ecriture);
        setAccountingReasoning(result.data.reasoning);
        setAccountingSuggestions(result.data.suggestions || []);
        setAccountingStatus("ready");
        
        toast({
          title: "Écriture comptable générée",
          description: "Consultez l'onglet 'Écriture Comptable' pour voir le résultat.",
        });
      } else {
        setAccountingStatus("error");
        toast({
          title: "Erreur de génération",
          description: result.error?.message || "Impossible de générer l'écriture",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Accounting] Erreur:", error);
      setAccountingStatus("error");
    }
  }, [toast]);

  // Supabase sync hook
  const {
    invoice,
    setInvoice,
    supabaseInvoice,
    pdfUrl,
    setPdfUrl,
    isWaitingForPWA,
    loadLatestInvoice,
    requestPhotoFromMobile,
    resetSync,
  } = useSupabaseSync({
    onInvoiceReceived: async (record) => {
      // Process the received invoice
      if (record.ai_result) {
        const result = record.ai_result as FlexibleInvoiceAIResult;
        setInvoiceData(result);
        if (result.is_invoice === false) {
          setStatus("not_invoice");
        } else {
          setStatus("complete");
          // Auto-generate accounting entry
          generateAccounting(result);
        }
        return;
      }

      // Analyze if not already analyzed
      if (record.image_base64 && isOpenRouterConfigured()) {
        await analyzeImage(record.image_base64, record.id);
      } else {
        setStatus("waiting");
      }
    },
  });

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Try Supabase first
        const supabaseRecord = await loadLatestInvoice();

        if (supabaseRecord) {
          // Check if already analyzed
          if (supabaseRecord.ai_result) {
            const result = supabaseRecord.ai_result as FlexibleInvoiceAIResult;
            setInvoiceData(result);
            if (result.is_invoice === false) {
              setStatus("not_invoice");
            } else {
              setStatus("complete");
              // Auto-generate accounting on load
              generateAccounting(result);
            }
          } else if (supabaseRecord.image_base64 && isOpenRouterConfigured()) {
            // Analyze if needed
            await analyzeImage(supabaseRecord.image_base64, supabaseRecord.id);
          } else {
            setStatus("waiting");
          }
          return;
        }

        // Fallback to local IndexedDB
        const latestInvoice = await getLatestInvoice();
        if (latestInvoice) {
          setInvoice({
            id: latestInvoice.id,
            image: latestInvoice.image,
            createdAt: latestInvoice.createdAt,
            analyzed: Boolean(latestInvoice.data),
          });

          if (latestInvoice.data) {
            const result = latestInvoice.data as unknown as FlexibleInvoiceAIResult;
            setInvoiceData(result);
            setStatus("complete");
            // Auto-generate accounting on load
            generateAccounting(result);
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

    loadInitialData();
  }, [loadLatestInvoice, setInvoiceData, setStatus, setInvoice, analyzeImage, generateAccounting]);

  // Handle new invoice (reset all state)
  const handleNewInvoice = useCallback(() => {
    resetSync();
    resetAnalysis();
    resetChat();
    // Reset accounting state
    setAccountingStatus("idle");
    setAccountingEntry(null);
    setAccountingReasoning(undefined);
    setAccountingSuggestions([]);
    setIsSavingAccounting(false);
    setIsAccountingSaved(false);
    toast({
      title: "Prêt pour une nouvelle facture",
      description: "Importez un fichier ou attendez un scan depuis le mobile.",
    });
  }, [resetSync, resetAnalysis, resetChat, toast]);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File) => {
      // Reset chat for new document
      resetChat();
      // Reset accounting state
      setAccountingStatus("idle");
      setAccountingEntry(null);
      setIsSavingAccounting(false);
      setIsAccountingSaved(false);

      // Update PDF URL for native display
      if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = () => setPdfUrl(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setPdfUrl(null);
      }

      // Analyze the file
      const { base64, result } = await analyzeFile(file);

      if (base64) {
        setInvoice({
          id: Date.now(),
          image: base64,
          createdAt: new Date(),
          analyzed: Boolean(result),
        });
      }

      // Auto-generate accounting entry after analysis
      if (result && result.is_invoice) {
        generateAccounting(result);
      }
    },
    [resetChat, analyzeFile, setInvoice, setPdfUrl, generateAccounting]
  );

  // Handle refine accounting entry
  const handleRefineAccounting = useCallback(
    async (feedback: string) => {
      if (!accountingEntry || !invoiceData) return;

      // If empty feedback, regenerate from scratch
      if (!feedback.trim()) {
        generateAccounting(invoiceData);
        return;
      }

      setAccountingStatus("refining");

      try {
        const result = await refineAccountingEntry(
          accountingEntry,
          feedback,
          invoiceData as Record<string, unknown>
        );

        if (result.success && result.data) {
          setAccountingEntry(result.data.ecriture);
          setAccountingReasoning(result.data.reasoning);
          setAccountingSuggestions(result.data.suggestions || []);
          setAccountingStatus("ready");
        } else {
          setAccountingStatus("error");
          toast({
            title: "Erreur",
            description: result.error?.message || "Impossible d'affiner l'écriture",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("[Accounting] Erreur refinement:", error);
        setAccountingStatus("error");
      }
    },
    [accountingEntry, invoiceData, generateAccounting, toast]
  );

  // Handle save accounting entry
  const handleSaveAccounting = useCallback(async () => {
    if (!accountingEntry) {
      toast({
        title: "Erreur",
        description: "Aucune écriture à sauvegarder",
        variant: "destructive",
      });
      return;
    }

    // Vérifier l'équilibre
    if (!accountingEntry.equilibre) {
      toast({
        title: "Écriture déséquilibrée",
        description: "L'écriture doit être équilibrée avant d'être sauvegardée.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAccounting(true);

    try {
      const result = await saveAccountingEntry(accountingEntry, {
        invoiceId: supabaseInvoice?.id,
        iaModel: "google/gemini-3-flash-preview",
        iaReasoning: accountingReasoning?.thinking_content,
        iaSuggestions: accountingSuggestions,
      });

      if (result.success) {
        setIsAccountingSaved(true);
        toast({
          title: "Écriture enregistrée ✓",
          description: `L'écriture ${accountingEntry.numero_piece} a été sauvegardée avec succès.`,
        });
      } else {
        toast({
          title: "Erreur de sauvegarde",
          description: result.error?.message || "Impossible de sauvegarder l'écriture",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Accounting] Erreur sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setIsSavingAccounting(false);
    }
  }, [accountingEntry, supabaseInvoice, accountingReasoning, accountingSuggestions, toast]);

  // Handle accounting chat with Gemini
  const handleAccountingChat = useCallback(
    async (message: string, entry: JournalEntry): Promise<string> => {
      try {
        console.log("[Accounting Chat] Sending message:", message);
        const result = await chatAboutEntry(message, entry);
        console.log("[Accounting Chat] Response received:", result);
        
        if (result.success && result.reply) {
          return result.reply;
        } else {
          throw new Error(result.error || "Erreur de réponse");
        }
      } catch (error) {
        console.error("[Accounting Chat] Error:", error);
        throw error;
      }
    },
    []
  );

  // Handle chat message
  const handleChatMessage = useCallback(
    async (message: string, forceReanalyze: boolean = false): Promise<string> => {
      if (!invoiceData) {
        throw new Error("No invoice data");
      }
      return sendMessage(message, invoiceData, invoice?.image || null, forceReanalyze);
    },
    [invoiceData, invoice?.image, sendMessage]
  );

  // Handle data regeneration from chat
  const handleRegenerateData = useCallback(
    (newData: FlexibleInvoiceAIResult) => {
      regenerateData(newData, supabaseInvoice?.id);
    },
    [regenerateData, supabaseInvoice?.id]
  );

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar
        activeItem={activeMenuItem}
        onItemClick={setActiveMenuItem}
      />

      {/* Vues plein écran pour Journaux, Grand Livre, Lettrage, États Financiers */}
      {(activeMenuItem === "journaux" || activeMenuItem === "grand-livre" || activeMenuItem === "lettrage" || activeMenuItem === "etats-financiers") ? (
        <div className="flex-1 overflow-auto">
          {activeMenuItem === "journaux" && <JournauxView />}
          {activeMenuItem === "grand-livre" && <GrandLivreView />}
          {activeMenuItem === "lettrage" && <LettrageView />}
          {activeMenuItem === "etats-financiers" && <EtatsFinanciersView />}
        </div>
      ) : (
        /* Layout standard avec panneau gauche/droite */
        <div className="flex-1 flex">
          <div className="flex-1 border-r border-border">
            <InvoiceDataPanel
              status={status}
              data={invoiceData}
              imageUrl={invoice?.image}
              onDataChange={updateData}
              onArticleChange={updateArticle}
              onNewInvoice={handleNewInvoice}
              onFileUpload={handleFileUpload}
              onRequestPhotoFromPWA={requestPhotoFromMobile}
              isWaitingForPWA={isWaitingForPWA}
              onSendChatMessage={status === "complete" && invoiceData ? handleChatMessage : undefined}
              onRegenerateChatData={handleRegenerateData}
              isChatLoading={isChatLoading}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
            />
          </div>

          <div className="w-[45%]">
            {activeMenuItem === "accounting" ? (
              <AccountingEntryView
                entry={accountingEntry}
                status={accountingStatus}
                reasoning={accountingReasoning}
                suggestions={accountingSuggestions}
                onRefine={handleRefineAccounting}
                onSave={handleSaveAccounting}
                onChat={handleAccountingChat}
                isSaving={isSavingAccounting}
                isSaved={isAccountingSaved}
              />
            ) : (
              <DocumentViewer
                imageUrl={pdfUrl ? null : (invoice?.image || null)}
                pdfUrl={pdfUrl}
                status={status}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
