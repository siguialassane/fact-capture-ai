import { useState, useEffect } from "react";
import { Camera, Bell, BellOff, Upload, ImageIcon, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoPreview } from "./PhotoPreview";
import { SuccessConfirmation } from "./SuccessConfirmation";
import {
  getActiveCaptureSession,
  subscribeToCaptureSession,
  saveInvoiceToSupabase,
  type CaptureSession
} from "@/lib/supabase";
import { analyzePDFDocument, type FlexibleInvoiceAIResult } from "@/lib/openrouter";
import { fileToBase64 } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

type MobileStep = "home" | "preview" | "success" | "analyzing";

export function MobileScanView() {
  const [step, setStep] = useState<MobileStep>("home");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<CaptureSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [analyzingMessage, setAnalyzingMessage] = useState<string>("");
  const { toast } = useToast();

  // Check for active capture session on load and subscribe to changes
  useEffect(() => {
    const checkSession = async () => {
      setIsCheckingSession(true);
      const session = await getActiveCaptureSession();
      setActiveSession(session);
      setIsCheckingSession(false);
    };

    checkSession();

    // Subscribe to session changes
    const subscription = subscribeToCaptureSession((session) => {
      if (session.status === "waiting") {
        setActiveSession(session);
      } else if (session.status === "cancelled" || session.status === "captured") {
        setActiveSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSessionManual = async () => {
    setIsCheckingSession(true);
    const session = await getActiveCaptureSession();
    setActiveSession(session);
    setIsCheckingSession(false);
  };


  // Handle file selection from native camera or gallery (images)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      setStep("preview");
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    event.target.value = "";
  };

  // Handle PDF file selection
  const handlePdfSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    event.target.value = "";

    try {
      setStep("analyzing");
      setAnalyzingMessage("Conversion du PDF...");
      
      const base64 = await fileToBase64(file);
      
      setAnalyzingMessage("Analyse par l'IA en cours...");
      
      const aiResult = await analyzePDFDocument(base64);
      
      if (aiResult) {
        setAnalyzingMessage("Envoi vers le serveur...");
        
        // Save to Supabase with sessionId if available
        await saveInvoiceToSupabase(base64, aiResult, activeSession?.id);
        
        if (aiResult.is_invoice === false) {
          toast({
            title: "Document non reconnu",
            description: aiResult.ai_comment || "Ce document ne semble pas être une facture.",
            variant: "destructive",
          });
          setStep("home");
        } else {
          toast({
            title: "PDF analysé avec succès",
            description: `${aiResult.type_facture ? `Facture ${aiResult.type_facture}` : "Facture"} envoyée à l'ordinateur.`,
          });
          setStep("success");
          setActiveSession(null);
        }
      } else {
        toast({
          title: "Erreur d'analyse",
          description: "Impossible d'analyser ce PDF.",
          variant: "destructive",
        });
        setStep("home");
      }
    } catch (error) {
      console.error("PDF upload error:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du traitement du PDF.",
        variant: "destructive",
      });
      setStep("home");
    }
  };

  const handleValidate = () => {
    setStep("success");
    // Clear session after successful capture
    setActiveSession(null);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setStep("home");
  };

  const handleNewScan = () => {
    setCapturedImage(null);
    setStep("home");
  };

  const canCapture = activeSession !== null;

  return (
    <div className="min-h-screen bg-background">
      {step === "home" && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Scanner de Factures
            </h1>
            <p className="text-muted-foreground">
              Numérisez et analysez vos factures
            </p>
          </div>

          {/* Session status indicator */}
          <div className="w-full mb-8">
            <div className={`px-4 py-4 rounded-xl flex items-center justify-between gap-3 shadow-sm ${canCapture
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-orange-50 text-orange-700 border border-orange-200"
              }`}>
              <div className="flex items-center gap-3">
                {canCapture ? (
                  <Bell className="h-5 w-5 animate-pulse text-green-600" />
                ) : (
                  <BellOff className="h-5 w-5 text-orange-500" />
                )}
                <div>
                  <p className="font-semibold text-sm">
                    {canCapture ? "Prêt à scanner" : "En attente du PC"}
                  </p>
                  <p className="text-xs opacity-80">
                    {canCapture ? "L'ordinateur attend votre photo" : "Lancez la demande sur l'ordinateur"}
                  </p>
                </div>
              </div>

              {!canCapture && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 bg-white/50 border-orange-200 hover:bg-white text-orange-700"
                  onClick={checkSessionManual}
                  disabled={isCheckingSession}
                >
                  {isCheckingSession ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    "Actualiser"
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {/* Camera Button */}
            <label
              className={`aspect-square rounded-2xl shadow-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border-2 ${canCapture
                ? "bg-primary text-white border-primary hover:shadow-xl hover:scale-105"
                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                }`}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                disabled={!canCapture}
                className="hidden"
              />
              <Camera className="h-7 w-7 mb-1" />
              <span className="font-semibold text-sm">Caméra</span>
            </label>

            {/* Gallery Button */}
            <label
              className={`aspect-square rounded-2xl shadow-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border-2 ${canCapture
                ? "bg-white text-primary border-primary/20 hover:border-primary hover:shadow-xl hover:scale-105"
                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={!canCapture}
                className="hidden"
              />
              <ImageIcon className="h-7 w-7 mb-1" />
              <span className="font-semibold text-sm">Galerie</span>
            </label>

            {/* PDF Button */}
            <label
              className={`aspect-square rounded-2xl shadow-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border-2 ${canCapture
                ? "bg-red-500 text-white border-red-500 hover:shadow-xl hover:scale-105"
                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                }`}
            >
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfSelect}
                disabled={!canCapture}
                className="hidden"
              />
              <FileText className="h-7 w-7 mb-1" />
              <span className="font-semibold text-sm">PDF</span>
            </label>
          </div>

          <p className="mt-8 text-xs text-muted-foreground text-center max-w-xs">
            {canCapture
              ? "Choisissez une méthode pour envoyer votre facture"
              : "Cliquez sur 'Nouveau → Photo' sur l'ordinateur pour activer les boutons ci-dessus"}
          </p>
        </div>
      )}

      {step === "preview" && capturedImage && (
        <PhotoPreview
          imageData={capturedImage}
          sessionId={activeSession?.id}
          onValidate={handleValidate}
          onRetake={handleRetake}
        />
      )}

      {step === "analyzing" && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6 animate-pulse">
            <FileText className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Analyse du PDF
          </h2>
          <p className="text-muted-foreground text-center mb-6">
            {analyzingMessage || "Traitement en cours..."}
          </p>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <Button
            variant="ghost"
            className="mt-8 text-muted-foreground"
            onClick={() => setStep("home")}
          >
            Annuler
          </Button>
        </div>
      )}

      {step === "success" && (
        <SuccessConfirmation onNewScan={handleNewScan} />
      )}
    </div>
  );
}
