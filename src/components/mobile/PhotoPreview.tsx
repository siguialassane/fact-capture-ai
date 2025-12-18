import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Check, RotateCcw, Loader2, Crop, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveInvoice } from "@/lib/db";
import { saveInvoiceToSupabase, markSessionAsCaptured } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { getCroppedImg, compressImageForUpload } from "@/lib/image-utils";

interface PhotoPreviewProps {
  imageData: string;
  sessionId?: string;
  onValidate: () => void;
  onRetake: () => void;
}

export function PhotoPreview({
  imageData,
  sessionId,
  onValidate,
  onRetake,
}: PhotoPreviewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const { toast } = useToast();

  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleValidate = async () => {
    setIsProcessing(true);

    try {
      setProcessingStep("Optimisation de l'image...");

      // Step 0: Process image (Crop + Resize + Compress)
      let finalImage = imageData;

      // Apply crop if enabled
      if (isCropping && croppedAreaPixels) {
        finalImage = await getCroppedImg(imageData, croppedAreaPixels);
      }

      // Compress for fast upload
      finalImage = await compressImageForUpload(finalImage);

      // Step 1: Save locally
      setProcessingStep("Sauvegarde locale...");
      await saveInvoice(finalImage);

      // Step 2: Sync to Supabase
      setProcessingStep("Envoi rapide Cloud...");
      const supabaseResult = await saveInvoiceToSupabase(finalImage);

      if (supabaseResult) {
        // Step 3: Mark session as captured
        if (sessionId) {
          await markSessionAsCaptured(sessionId);
        }

        toast({
          title: "✅ Photo envoyée !",
          description: "Analyse en cours sur l'ordinateur...",
        });
        onValidate();
      } else {
        throw new Error("Erreur d'envoi");
      }

    } catch (error) {
      console.error("Error processing:", error);
      toast({
        title: "Erreur",
        description: "Échec de l'envoi. Vérifiez votre connexion.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col animate-in z-50">

      {/* Content Area */}
      <div className="flex-1 relative bg-black w-full h-full overflow-hidden">
        {isCropping ? (
          <Cropper
            image={imageData}
            crop={crop}
            zoom={zoom}
            aspect={undefined} // Free aspect ratio
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            objectFit="contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={imageData}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Controls Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-lg font-medium animate-pulse">{processingStep}</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-black/80 backdrop-blur-md p-4 pb-8 border-t border-white/10">

        {/* Crop Controls */}
        <div className="flex justify-center mb-6">
          <Button
            variant={isCropping ? "default" : "secondary"}
            onClick={() => setIsCropping(!isCropping)}
            className="rounded-full gap-2"
            size="sm"
          >
            <Crop className="h-4 w-4" />
            {isCropping ? "Terminer le rognage" : "Rogner l'image"}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center max-w-md mx-auto">
          <Button
            variant="outline"
            size="lg"
            onClick={onRetake}
            disabled={isProcessing}
            className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reprendre
          </Button>

          <Button
            size="lg"
            onClick={handleValidate}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? "Envoi..." : "Valider"}
          </Button>
        </div>
      </div>
    </div>
  );
}
