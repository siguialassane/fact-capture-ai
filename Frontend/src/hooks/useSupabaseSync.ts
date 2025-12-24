import { useState, useEffect, useCallback } from "react";
import {
  getLatestInvoiceFromSupabase,
  getInvoiceById,
  subscribeToInvoices,
  requestPhotoFromPWA,
  type InvoiceRecord,
} from "@/lib/supabase";
import { isOpenRouterConfigured, type FlexibleInvoiceAIResult } from "@/lib/openrouter";
import { useToast } from "@/hooks/use-toast";

interface InvoiceLocalData {
  id: number | string;
  image: string;
  createdAt: Date;
  analyzed: boolean;
}

interface UseSupabaseSyncOptions {
  onInvoiceReceived?: (record: InvoiceRecord) => Promise<void>;
  autoSubscribe?: boolean;
}

interface UseSupabaseSyncReturn {
  invoice: InvoiceLocalData | null;
  setInvoice: React.Dispatch<React.SetStateAction<InvoiceLocalData | null>>;
  supabaseInvoice: InvoiceRecord | null;
  setSupabaseInvoice: React.Dispatch<React.SetStateAction<InvoiceRecord | null>>;
  pdfUrl: string | null;
  setPdfUrl: React.Dispatch<React.SetStateAction<string | null>>;
  isWaitingForPWA: boolean;
  loadLatestInvoice: () => Promise<InvoiceRecord | null>;
  requestPhotoFromMobile: () => Promise<boolean>;
  resetSync: () => void;
  isOpenRouterReady: boolean;
}

export function useSupabaseSync(
  options: UseSupabaseSyncOptions = {}
): UseSupabaseSyncReturn {
  const { onInvoiceReceived, autoSubscribe = true } = options;
  const { toast } = useToast();

  const [invoice, setInvoice] = useState<InvoiceLocalData | null>(null);
  const [supabaseInvoice, setSupabaseInvoice] = useState<InvoiceRecord | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isWaitingForPWA, setIsWaitingForPWA] = useState(false);

  const isOpenRouterReady = isOpenRouterConfigured();

  /**
   * Convert Supabase record to local invoice data
   */
  const processRecord = useCallback(
    (record: InvoiceRecord): InvoiceLocalData => {
      const isPdf = record.image_base64?.startsWith("data:application/pdf");
      setPdfUrl(isPdf && record.image_base64 ? record.image_base64 : null);

      return {
        id: record.id ?? Date.now(),
        image: record.image_base64 || "",
        createdAt: new Date(record.created_at || Date.now()),
        analyzed: Boolean(record.ai_result),
      };
    },
    []
  );

  /**
   * Load the latest invoice from Supabase
   */
  const loadLatestInvoice = useCallback(async (): Promise<InvoiceRecord | null> => {
    try {
      const record = await getLatestInvoiceFromSupabase();

      if (record) {
        setSupabaseInvoice(record);
        setInvoice(processRecord(record));
        return record;
      }

      return null;
    } catch (error) {
      console.error("Error loading invoice:", error);
      return null;
    }
  }, [processRecord]);

  /**
   * Request a photo from the mobile PWA
   */
  const requestPhotoFromMobile = useCallback(async (): Promise<boolean> => {
    setIsWaitingForPWA(true);

    const session = await requestPhotoFromPWA();

    if (session) {
      toast({
        title: "📱 En attente de photo",
        description: "Prenez une photo sur votre mobile pour la synchroniser.",
      });
      return true;
    } else {
      setIsWaitingForPWA(false);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session. Vérifiez votre connexion.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  /**
   * Reset sync state
   */
  const resetSync = useCallback(() => {
    setInvoice(null);
    setSupabaseInvoice(null);
    setPdfUrl(null);
    setIsWaitingForPWA(false);
  }, []);

  /**
   * Subscribe to real-time updates from Supabase
   */
  useEffect(() => {
    if (!autoSubscribe) return;

    const channel = subscribeToInvoices(async (payload) => {
      if (payload.new && payload.new.id) {
        toast({
          title: "Nouvelle facture détectée",
          description: "Téléchargement de l'image...",
        });

        // Fetch full record (realtime payload might truncate large fields)
        const fullRecord = await getInvoiceById(payload.new.id);

        if (fullRecord) {
          setSupabaseInvoice(fullRecord);
          setInvoice(processRecord(fullRecord));
          setIsWaitingForPWA(false);

          toast({
            title: "Facture reçue",
            description: "Analyse en cours...",
          });

          // Call custom handler if provided
          await onInvoiceReceived?.(fullRecord);
        }
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [autoSubscribe, toast, processRecord, onInvoiceReceived]);

  return {
    invoice,
    setInvoice,
    supabaseInvoice,
    setSupabaseInvoice,
    pdfUrl,
    setPdfUrl,
    isWaitingForPWA,
    loadLatestInvoice,
    requestPhotoFromMobile,
    resetSync,
    isOpenRouterReady,
  };
}

/**
 * Helper to check if invoice data indicates a valid invoice
 */
export function isValidInvoice(data: FlexibleInvoiceAIResult | null): boolean {
  return data !== null && data.is_invoice !== false;
}

/**
 * Helper to get display status from AI result
 */
export function getInvoiceDisplayStatus(
  data: FlexibleInvoiceAIResult | null
): "waiting" | "complete" | "not_invoice" {
  if (!data) return "waiting";
  if (data.is_invoice === false) return "not_invoice";
  return "complete";
}
