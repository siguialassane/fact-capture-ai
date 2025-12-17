import { CheckCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

interface SuccessConfirmationProps {
  onNewScan: () => void;
}

export function SuccessConfirmation({ onNewScan }: SuccessConfirmationProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background animate-in">
      <div className="text-center">
        {/* Success animation */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-14 w-14 text-success animate-in" />
          </div>
          <div className="absolute -top-2 -right-2">
            <StatusBadge variant="success">Sauvegardé</StatusBadge>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          Photo sauvegardée !
        </h2>
        <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
          Ouvrez l'application sur votre ordinateur pour analyser et exporter
          les données de la facture.
        </p>

        <Button
          size="lg"
          variant="outline"
          onClick={onNewScan}
          className="h-12 px-6"
        >
          <Camera className="h-5 w-5 mr-2" />
          Nouveau scan
        </Button>
      </div>
    </div>
  );
}
