import { useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "./CameraCapture";
import { PhotoPreview } from "./PhotoPreview";
import { SuccessConfirmation } from "./SuccessConfirmation";

type MobileStep = "home" | "camera" | "preview" | "success";

export function MobileScanView() {
  const [step, setStep] = useState<MobileStep>("home");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData);
    setStep("preview");
  };

  const handleValidate = () => {
    setStep("success");
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setStep("camera");
  };

  const handleNewScan = () => {
    setCapturedImage(null);
    setStep("home");
  };

  return (
    <div className="min-h-screen bg-background">
      {step === "home" && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Scanner de Factures
            </h1>
            <p className="text-muted-foreground">
              Numérisez et analysez vos factures en quelques secondes
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => setStep("camera")}
            className="h-32 w-32 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 pulse-scale"
          >
            <div className="flex flex-col items-center gap-2">
              <Camera className="h-10 w-10" />
              <span className="text-sm font-medium">Scanner</span>
            </div>
          </Button>

          <p className="mt-8 text-sm text-muted-foreground text-center max-w-xs">
            Appuyez sur le bouton pour ouvrir la caméra et scanner votre facture
          </p>
        </div>
      )}

      {step === "camera" && (
        <CameraCapture
          onCapture={handleCapture}
          onCancel={() => setStep("home")}
        />
      )}

      {step === "preview" && capturedImage && (
        <PhotoPreview
          imageData={capturedImage}
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
