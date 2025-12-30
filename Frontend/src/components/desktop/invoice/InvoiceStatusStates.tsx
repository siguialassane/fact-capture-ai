/**
 * InvoiceStatusStates - États d'attente et d'erreur de la facture
 */

import { Receipt, AlertTriangle, MessageSquare, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { FlexibleInvoiceAIResult } from "@/lib/openrouter";

interface InvoiceStatusStatesProps {
    status: "waiting" | "analyzing" | "complete" | "error" | "not_invoice";
    data: FlexibleInvoiceAIResult | null;
    onNewInvoice: () => void;
    onUploadClick: () => void;
}

export function InvoiceStatusStates({
    status,
    data,
    onNewInvoice,
    onUploadClick,
}: InvoiceStatusStatesProps) {
    if (status === "waiting") {
        return (
            <div className="flex items-center justify-center h-full animate-in">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center mx-auto mb-6">
                        <Receipt className="h-10 w-10 text-violet-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        En attente d'une facture
                    </h3>
                    <p className="text-muted-foreground mb-6">
                        Scannez une facture depuis le mobile ou importez un fichier (Image, PDF)
                    </p>
                    <Button variant="outline" onClick={onUploadClick} className="gap-2">
                        <Upload className="h-4 w-4" />
                        Importer un fichier
                    </Button>
                </div>
            </div>
        );
    }

    if (status === "analyzing") {
        return (
            <div className="flex items-center justify-center h-full animate-in">
                <div className="text-center">
                    <LoadingSpinner size="lg" className="mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-2">Analyse IA en cours...</p>
                    <p className="text-sm text-muted-foreground">Extraction et validation du document</p>
                </div>
            </div>
        );
    }

    if (status === "not_invoice" && data) {
        return (
            <div className="flex items-center justify-center h-full animate-in">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="h-10 w-10 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Document non reconnu</h3>
                    <p className="text-muted-foreground mb-4">Ce document ne semble pas être une facture.</p>
                    {data.ai_comment && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left mb-4">
                            <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                                <MessageSquare className="h-4 w-4" />
                                Commentaire IA
                            </div>
                            <p className="text-sm text-amber-800">{data.ai_comment}</p>
                        </div>
                    )}
                    <Button variant="outline" onClick={onNewInvoice}>
                        <Plus className="h-4 w-4 mr-2" />
                        Essayer une autre facture
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
