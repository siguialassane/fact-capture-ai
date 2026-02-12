import { useState, useCallback } from "react";
import {
  analyzeInvoiceImage,
  analyzePDFDocument,
  type FlexibleInvoiceAIResult,
} from "@/lib/openrouter";
import { saveInvoiceToSupabase, updateInvoiceAIResult } from "@/lib/supabase";
import { fileToBase64 } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

export type AnalysisStatus = "waiting" | "analyzing" | "complete" | "error" | "not_invoice";
export type AnalysisPhase = "ocr" | "complete";

export const emptyInvoiceData: FlexibleInvoiceAIResult = {
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

export interface AnalysisTimings {
  qwen?: number;
  total?: number;
}

interface UseInvoiceAnalysisOptions {
  onAnalysisComplete?: (result: FlexibleInvoiceAIResult, timings?: AnalysisTimings) => void;
  onAnalysisError?: (error: Error) => void;
}

interface UseInvoiceAnalysisReturn {
  status: AnalysisStatus;
  setStatus: React.Dispatch<React.SetStateAction<AnalysisStatus>>;
  invoiceData: FlexibleInvoiceAIResult | null;
  setInvoiceData: React.Dispatch<React.SetStateAction<FlexibleInvoiceAIResult | null>>;
  analyzeImage: (base64: string, recordId?: number) => Promise<FlexibleInvoiceAIResult | null>;
  analyzeFile: (file: File) => Promise<{ base64: string; result: FlexibleInvoiceAIResult | null }>;
  updateData: (field: string, value: string) => void;
  updateArticle: (index: number, field: string, value: string) => void;
  resetAnalysis: () => void;
  analysisPhase: AnalysisPhase | null;
  analysisStartTime: number | null;
  analysisTimings: AnalysisTimings | null;
}

export function useInvoiceAnalysis(
  options: UseInvoiceAnalysisOptions = {}
): UseInvoiceAnalysisReturn {
  const { onAnalysisComplete, onAnalysisError } = options;
  const { toast } = useToast();

  const [status, setStatus] = useState<AnalysisStatus>("waiting");
  const [invoiceData, setInvoiceData] = useState<FlexibleInvoiceAIResult | null>(null);
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase | null>(null);
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const [analysisTimings, setAnalysisTimings] = useState<AnalysisTimings | null>(null);

  /**
   * Analyze an image (base64) and optionally update a Supabase record
   */
  const analyzeImage = useCallback(
    async (base64: string, recordId?: number): Promise<FlexibleInvoiceAIResult | null> => {
      setStatus("analyzing");
      setAnalysisPhase("ocr");
      const startTime = Date.now();
      setAnalysisStartTime(startTime);
      setAnalysisTimings(null);

      try {
        // Phase 1: Qwen OCR extraction
        const qwenStart = Date.now();
        const aiResult = await analyzeInvoiceImage(base64);
        const qwenDuration = Date.now() - qwenStart;

        if (aiResult) {
          setInvoiceData(aiResult);

          const totalDuration = Date.now() - startTime;
          const timings: AnalysisTimings = {
            qwen: qwenDuration,
            total: totalDuration,
          };
          
          setAnalysisTimings(timings);
          setAnalysisPhase("complete");

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
              description: `${aiResult.type_facture ? `Facture ${aiResult.type_facture}` : "Facture"} analysée avec succès en ${(totalDuration / 1000).toFixed(1)}s (Qwen: ${(qwenDuration / 1000).toFixed(1)}s)`,
            });
          }

          // Update Supabase record if ID provided
          if (recordId) {
            await updateInvoiceAIResult(recordId, aiResult);
          }

          onAnalysisComplete?.(aiResult, timings);
          return aiResult;
        } else {
          setStatus("error");
          setAnalysisPhase(null);
          toast({
            title: "Erreur d'analyse",
            description: "Impossible d'analyser le document.",
            variant: "destructive",
          });
          return null;
        }
      } catch (error) {
        console.error("Analysis error:", error);
        setStatus("error");
        setAnalysisPhase(null);
        onAnalysisError?.(error instanceof Error ? error : new Error(String(error)));
        toast({
          title: "Erreur",
          description: "Impossible d'analyser l'image.",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast, onAnalysisComplete, onAnalysisError]
  );

  /**
   * Analyze a file (supports images and PDFs)
   */
  const analyzeFile = useCallback(
    async (file: File): Promise<{ base64: string; result: FlexibleInvoiceAIResult | null }> => {
      setStatus("analyzing");
      setAnalysisPhase("ocr");
      const startTime = Date.now();
      setAnalysisStartTime(startTime);
      setAnalysisTimings(null);

      try {
        const base64 = await fileToBase64(file);
        let aiResult: FlexibleInvoiceAIResult | null = null;

        // Phase 1: Qwen OCR extraction
        const qwenStart = Date.now();
        if (file.type === "application/pdf") {
          aiResult = await analyzePDFDocument(base64);
        } else {
          aiResult = await analyzeInvoiceImage(base64);
        }
        const qwenDuration = Date.now() - qwenStart;

        if (aiResult) {
          setInvoiceData(aiResult);

          // Save to Supabase
          await saveInvoiceToSupabase(base64, aiResult);

          const totalDuration = Date.now() - startTime;
          const timings: AnalysisTimings = {
            qwen: qwenDuration,
            total: totalDuration,
          };
          
          setAnalysisTimings(timings);
          setAnalysisPhase("complete");

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
              description: `${aiResult.type_facture ? `Facture de type "${aiResult.type_facture}"` : "Facture"} analysée avec succès en ${(totalDuration / 1000).toFixed(1)}s (Qwen: ${(qwenDuration / 1000).toFixed(1)}s)`,
            });
          }

          onAnalysisComplete?.(aiResult, timings);
        } else {
          setStatus("error");
          setAnalysisPhase(null);
          toast({
            title: "Erreur",
            description: "Impossible d'analyser ce fichier.",
            variant: "destructive",
          });
        }

        return { base64, result: aiResult };
      } catch (error) {
        console.error("File analysis error:", error);
        setStatus("error");
        setAnalysisPhase(null);
        onAnalysisError?.(error instanceof Error ? error : new Error(String(error)));
        toast({
          title: "Erreur",
          description: "Erreur lors du traitement du fichier.",
          variant: "destructive",
        });
        return { base64: "", result: null };
      }
    },
    [toast, onAnalysisComplete, onAnalysisError]
  );

  /**
   * Update a single field in invoice data
   */
  const updateData = useCallback((field: string, value: string) => {
    setInvoiceData((prev) => {
      if (!prev) return null;

      // Special handling for extra_fields (passed as JSON string)
      if (field === "extra_fields") {
        try {
          const parsedExtraFields = JSON.parse(value);
          return { ...prev, extra_fields: parsedExtraFields };
        } catch {
          console.error("Invalid JSON for extra_fields");
          return prev;
        }
      }

      return { ...prev, [field]: value };
    });
  }, []);

  /**
   * Update a field in a specific article
   */
  const updateArticle = useCallback((index: number, field: string, value: string) => {
    setInvoiceData((prev) => {
      if (!prev || !prev.articles) return prev;
      return {
        ...prev,
        articles: prev.articles.map((article, i) =>
          i === index ? { ...article, [field]: value } : article
        ),
      };
    });
  }, []);

  /**
   * Reset analysis state
   */
  const resetAnalysis = useCallback(() => {
    setInvoiceData(null);
    setStatus("waiting");
    setAnalysisPhase(null);
    setAnalysisStartTime(null);
    setAnalysisTimings(null);
  }, []);

  return {
    status,
    setStatus,
    invoiceData,
    setInvoiceData,
    analyzeImage,
    analyzeFile,
    updateData,
    updateArticle,
    resetAnalysis,
    analysisPhase,
    analysisStartTime,
    analysisTimings,
  };
}
