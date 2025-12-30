import { useEffect, useCallback } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { StatsDashboard } from "./StatsDashboard";
import { DocumentViewer } from "./DocumentViewer";
import { InvoiceDataPanel } from "./InvoiceDataPanel";
import { AccountingEntryView } from "@/components/accounting";
import { InvoiceArticlesList } from "@/components/accounting/InvoiceArticlesList";
import { PaymentStatusSelector } from "@/components/desktop/PaymentStatusSelector"; // Restauré
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
  type StatutPaiement,
} from "@/lib/api/backend-client";
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

  // Payment Selection State (Workflow Restauré)
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [confirmedPaymentStatus, setConfirmedPaymentStatus] = useState<StatutPaiement | undefined>(undefined);
  const [confirmedPartialAmount, setConfirmedPartialAmount] = useState<number | undefined>(undefined);

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

  // RESTAURÉ : Fonction pour déclencher la sélection du statut
  const triggerPaymentStatusSelection = useCallback((data: FlexibleInvoiceAIResult) => {
    if (!data.is_invoice) return;
    console.log("[Accounting] Affichage du sélecteur de statut de paiement...");
    setShowPaymentSelector(true);
    // On efface toute entrée précédente si nouvelle analyse
    setAccountingEntry(null);
    setAccountingStatus("idle");
  }, []);

  // RESTAURÉ : Génération comptable avec statut confirmé
  const generateAccounting = useCallback(async (
    data: FlexibleInvoiceAIResult,
    statutPaiement?: StatutPaiement,
    montantPartiel?: number
  ) => {
    if (!data.is_invoice) return;

    console.log("[Accounting] Démarrage de la génération d'écriture comptable...");
    setAccountingStatus("generating");
    setShowPaymentSelector(false); // Masquer le sélecteur une fois lancé

    try {
      // On passe le statut confirmé à l'API (si supporté par backend) ou au moins on l'utilise pour le contexte local
      const result = await generateAccountingEntry(
        data as Record<string, unknown>,
        statutPaiement, // Argument potentiellement à réintégrer dans l'API front
        montantPartiel
      );

      if (result.success && result.data) {
        setAccountingEntry(result.data.ecriture);
        setAccountingReasoning(result.data.reasoning);
        setAccountingSuggestions(result.data.suggestions || []);
        setAccountingStatus("ready");

        // Stocker le choix pour l'affichage
        setConfirmedPaymentStatus(statutPaiement);
        setConfirmedPartialAmount(montantPartiel);

        toast({
          title: "Écriture comptable générée",
          description: "Consultez l'onglet 'Comptabilisation' pour voir le résultat.",
        });
      } else {
        setAccountingStatus("error");
        // Si erreur, on peut réafficher le sélecteur pour réessayer ? Ou laisser l'erreur.
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

  // RESTAURÉ : Callback de confirmation depuis le sélecteur
  const handlePaymentStatusConfirm = useCallback((status: StatutPaiement, partialAmount?: number) => {
    if (!invoiceData) return;
    console.log(`[Accounting] Statut confirmé: ${status}, montant partiel: ${partialAmount}`);
    generateAccounting(invoiceData, status, partialAmount);
  }, [invoiceData, generateAccounting]);

  // RESTAURÉ : Callback pour régénérer avec un nouveau statut (depuis la vue comptable)
  const handleRegenerateWithNewStatus = useCallback((status: StatutPaiement, partialAmount?: number) => {
    if (!invoiceData) return;
    console.log(`[Accounting] Régénération avec nouveau statut: ${status}`);
    setIsAccountingSaved(false);
    generateAccounting(invoiceData, status, partialAmount);
  }, [invoiceData, generateAccounting]);


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
          // STOP AUTO-GENERATE -> Trigger Selection
          triggerPaymentStatusSelection(result);
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
              // STOP AUTO-GENERATE -> Trigger Selection
              triggerPaymentStatusSelection(result);
            }
          } else if (supabaseRecord.image_base64 && isOpenRouterConfigured()) {
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
            // STOP AUTO-GENERATE -> Trigger Selection
            triggerPaymentStatusSelection(result);
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
  }, [loadLatestInvoice, setInvoiceData, setStatus, setInvoice, analyzeImage, triggerPaymentStatusSelection]);

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

    // Reset payment selector
    setShowPaymentSelector(false);
    setConfirmedPaymentStatus(undefined);
    setConfirmedPartialAmount(undefined);

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

      // Reset payment selector
      setShowPaymentSelector(false);
      setConfirmedPaymentStatus(undefined);

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

      // STOP AUTO-GENERATE -> Trigger Selection
      if (result && result.is_invoice) {
        triggerPaymentStatusSelection(result);
      }
    },
    [resetChat, analyzeFile, setInvoice, setPdfUrl, triggerPaymentStatusSelection]
  );

  // Handle refine accounting entry
  const handleRefineAccounting = useCallback(
    async (feedback: string) => {
      if (!accountingEntry || !invoiceData) return;

      if (!feedback.trim()) {
        // Regenerate with SAME status
        generateAccounting(invoiceData, confirmedPaymentStatus, confirmedPartialAmount);
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
    [accountingEntry, invoiceData, generateAccounting, confirmedPaymentStatus, confirmedPartialAmount, toast]
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
    <div className="h-screen bg-background flex overflow-hidden">
      <DashboardSidebar
        activeItem={activeMenuItem}
        onItemClick={setActiveMenuItem}
      />

      {(activeMenuItem === "dashboard" || activeMenuItem === "journaux" || activeMenuItem === "grand-livre" || activeMenuItem === "lettrage" || activeMenuItem === "etats-financiers") ? (
        <div className="flex-1 overflow-auto">
          {activeMenuItem === "dashboard" && <StatsDashboard />}
          {activeMenuItem === "journaux" && <JournauxView />}
          {activeMenuItem === "grand-livre" && <GrandLivreView />}
          {activeMenuItem === "lettrage" && <LettrageView />}
          {activeMenuItem === "etats-financiers" && <EtatsFinanciersView />}
        </div>
      ) : (
        <div className="flex-1 flex">
          <div className="flex-1 border-r border-border">
            {activeMenuItem === "accounting" ? (
              // LOGIQUE D'AFFICHAGE DU SELECTEUR
              showPaymentSelector && invoiceData ? (
                <div className="h-full overflow-auto p-6 bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center">
                  <div className="w-full max-w-xl">
                    <PaymentStatusSelector
                      suggestedStatus={(invoiceData as any).statut_paiement_suggere || "inconnu"}
                      paymentIndices={(invoiceData as any).indices_paiement || []}
                      paymentMode={(invoiceData as any).mode_paiement}
                      totalAmount={(() => {
                        // Helper pour choper le montant
                        const mt = (invoiceData as any).montant_total;
                        if (typeof mt === 'number') return mt;
                        if (typeof mt === 'string') return Number(mt.replace(/[^0-9.,]/g, '').replace(',', '.')) || undefined;
                        return undefined;
                      })()}
                      onConfirm={handlePaymentStatusConfirm}
                    />
                  </div>
                </div>
              ) : (
                <AccountingEntryView
                  entry={accountingEntry}
                  status={accountingStatus}
                  reasoning={accountingReasoning}
                  suggestions={accountingSuggestions}
                  invoiceData={invoiceData || undefined}
                  confirmedStatus={confirmedPaymentStatus}
                  confirmedPartialAmount={confirmedPartialAmount}
                  onRefine={handleRefineAccounting}
                  onSave={handleSaveAccounting}
                  onChat={handleAccountingChat}
                  isSaving={isSavingAccounting}
                  isSaved={isAccountingSaved}
                  onRegenerate={() => setShowPaymentSelector(true)} // Retour au sélecteur
                  onRegenerateWithStatus={handleRegenerateWithNewStatus}
                />
              )
            ) : (
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
            )}
          </div>

          <div className="w-[45%]">
            {activeMenuItem === "accounting" ? (
              <InvoiceArticlesList
                invoiceData={invoiceData || undefined}
                onArticleChange={updateArticle}
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
