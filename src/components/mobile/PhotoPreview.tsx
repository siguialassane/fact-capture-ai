import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveInvoice } from "@/lib/db";

interface PhotoPreviewProps {
  imageData: string;
  onValidate: () => void;
  onRetake: () => void;
}

export function PhotoPreview({
  imageData,
  onValidate,
  onRetake,
}: PhotoPreviewProps) {
  const handleValidate = async () => {
    try {
      await saveInvoice(imageData);
      onValidate();
    } catch (error) {
      console.error("Error saving invoice:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col animate-in">
      {/* Image preview */}
      <div className="flex-1 flex items-center justify-center p-4">
        <img
          src={imageData}
          alt="Facture capturée"
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
      </div>

      {/* Action buttons */}
      <div className="p-6 pb-10 flex gap-4 justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={onRetake}
          className="flex-1 max-w-[160px] h-14 bg-white/10 border-white/30 text-white hover:bg-white/20"
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          Reprendre
        </Button>
        <Button
          size="lg"
          onClick={handleValidate}
          className="flex-1 max-w-[160px] h-14 bg-success hover:bg-success/90"
        >
          <Check className="h-5 w-5 mr-2" />
          Valider
        </Button>
      </div>
    </div>
  );
}
