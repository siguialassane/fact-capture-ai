/**
 * InvoiceHeader - Barre d'outils du panneau de données facture
 */

import { useRef } from "react";
import {
    Receipt,
    Image,
    FileDown,
    FileSpreadsheet,
    Plus,
    FolderOpen,
    Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface InvoiceHeaderProps {
    statusBadge: React.ReactNode;
    isReady: boolean;
    isExporting: boolean;
    imageUrl?: string | null;
    showNewDialog: boolean;
    setShowNewDialog: (open: boolean) => void;
    isWaitingForPWA: boolean;
    onNewInvoice: () => void;
    onFileUpload: (file: File) => void;
    onRequestPhotoFromPWA?: () => void;
    onExportPDF: () => void;
    onExportExcel: () => void;
    onDownloadImage: () => void;
}

export function InvoiceHeader({
    statusBadge,
    isReady,
    isExporting,
    imageUrl,
    showNewDialog,
    setShowNewDialog,
    isWaitingForPWA,
    onNewInvoice,
    onFileUpload,
    onRequestPhotoFromPWA,
    onExportPDF,
    onExportExcel,
    onDownloadImage,
}: InvoiceHeaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileUpload(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">DONNÉES EXTRAITES</h2>
                {statusBadge}
            </div>
            <div className="flex items-center gap-2">
                {/* Nouvelle facture - Dialog avec 2 options */}
                <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-violet-300 text-violet-600 hover:bg-violet-50 hover:text-violet-700"
                        >
                            <Plus className="h-4 w-4" />
                            Nouvelle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-center text-xl">Nouvelle facture</DialogTitle>
                            <DialogDescription className="text-center">
                                Choisissez comment ajouter votre facture
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-6">
                            {/* Option 1: Importer depuis l'ordinateur */}
                            <button
                                onClick={() => {
                                    setShowNewDialog(false);
                                    onNewInvoice();
                                    setTimeout(() => fileInputRef.current?.click(), 100);
                                }}
                                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-400 transition-all group"
                            >
                                <div className="p-4 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                                    <FolderOpen className="h-8 w-8 text-blue-600" />
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-blue-700">Importer</p>
                                    <p className="text-xs text-blue-600/70 mt-1">
                                        Depuis l'ordinateur
                                    </p>
                                </div>
                            </button>

                            {/* Option 2: Attendre une photo PWA */}
                            <button
                                onClick={() => {
                                    setShowNewDialog(false);
                                    onNewInvoice();
                                    onRequestPhotoFromPWA?.();
                                }}
                                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed transition-all group ${isWaitingForPWA
                                    ? "border-green-400 bg-green-50 animate-pulse"
                                    : "border-orange-300 bg-orange-50/50 hover:bg-orange-100 hover:border-orange-400"
                                    }`}
                            >
                                <div className={`p-4 rounded-full transition-colors ${isWaitingForPWA
                                    ? "bg-green-200"
                                    : "bg-orange-100 group-hover:bg-orange-200"
                                    }`}>
                                    <Camera className={`h-8 w-8 ${isWaitingForPWA ? "text-green-600" : "text-orange-600"}`} />
                                </div>
                                <div className="text-center">
                                    <p className={`font-semibold ${isWaitingForPWA ? "text-green-700" : "text-orange-700"}`}>
                                        {isWaitingForPWA ? "En attente..." : "Appareil photo"}
                                    </p>
                                    <p className={`text-xs mt-1 ${isWaitingForPWA ? "text-green-600/70" : "text-orange-600/70"}`}>
                                        {isWaitingForPWA ? "Prenez une photo sur le mobile" : "Scanner via mobile"}
                                    </p>
                                </div>
                            </button>
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                            Formats acceptés : Images (JPG, PNG) et PDF
                        </p>
                    </DialogContent>
                </Dialog>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Importer un fichier"
                />

                <Button
                    variant="outline"
                    size="sm"
                    disabled={!imageUrl}
                    onClick={onDownloadImage}
                    className="gap-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                >
                    <Image className="h-4 w-4" />
                    Image
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    disabled={!isReady || isExporting}
                    onClick={onExportPDF}
                    className="gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                >
                    <FileDown className="h-4 w-4" />
                    PDF
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    disabled={!isReady}
                    onClick={onExportExcel}
                    className="gap-2 border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                </Button>
            </div>
        </div>
    );
}
