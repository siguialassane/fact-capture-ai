import { FileText, ZoomIn, ZoomOut, Download, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useState } from "react";

interface DocumentViewerProps {
  imageUrl: string | null;
  status: "waiting" | "analyzing" | "complete" | "error";
}

export function DocumentViewer({ imageUrl, status }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleReset = () => setZoom(100);

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">DOCUMENT VIEWER</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="h-8 w-8"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="h-8 w-8"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-8 w-8"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Document area */}
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
        {!imageUrl ? (
          <div className="text-center animate-in">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              En attente d'une facture depuis le mobile...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Scannez une facture avec votre téléphone
            </p>
          </div>
        ) : (
          <div
            className="relative bg-white rounded-lg shadow-lg overflow-hidden transition-transform duration-300 animate-in"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <img
              src={imageUrl}
              alt="Facture scannée"
              className="max-w-full max-h-[70vh] object-contain"
            />
            {status === "analyzing" && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <LoadingSpinner size="lg" className="mx-auto mb-4" />
                  <p className="text-foreground font-medium">Analyse en cours...</p>
                  <p className="text-sm text-muted-foreground">
                    Extraction des données
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
