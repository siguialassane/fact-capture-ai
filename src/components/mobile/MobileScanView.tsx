import { useState, useEffect } from "react";
import { Camera, Bell, BellOff, Upload, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoPreview } from "./PhotoPreview";
import { SuccessConfirmation } from "./SuccessConfirmation";
import {
  getActiveCaptureSession,
  subscribeToCaptureSession,
  type CaptureSession
} from "@/lib/supabase";

type MobileStep = "home" | "preview" | "success";

export function MobileScanView() {
  const [step, setStep] = useState<MobileStep>("home");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<CaptureSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

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


  // Handle file selection from native camera or gallery
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
                    <Loader2 className="h-3 w-3 animate-spin map-1" />
                  ) : (
                    "Actualiser"
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-2 gap-4 w-full">
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
              <Camera className="h-8 w-8 mb-2" />
              <span className="font-semibold">Caméra</span>
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
                // No capture attribute = gallery/choice
                onChange={handleFileSelect}
                disabled={!canCapture}
                className="hidden"
              />
              <ImageIcon className="h-8 w-8 mb-2" />
              <span className="font-semibold">Galerie</span>
            </label>
          </div>

          <p className="mt-8 text-xs text-muted-foreground text-center max-w-xs">
            {canCapture
              ? "Choisissez une méthode pour envoyer la photo"
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

      {step === "success" && (
        <SuccessConfirmation onNewScan={handleNewScan} />
      )}
    </div>
  );
}
