import { useState } from "react";
import {
    Check,
    CreditCard,
    AlertCircle,
    HelpCircle,
    CheckCircle2,
    Clock,
    PieChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { StatutPaiement } from "@/lib/api/backend-client";

interface PaymentStatusSelectorProps {
    suggestedStatus: string;
    paymentIndices: string[];
    paymentMode?: string;
    totalAmount?: number;
    onConfirm: (status: StatutPaiement, partialAmount?: number) => void;
}

export function PaymentStatusSelector({
    suggestedStatus,
    paymentIndices,
    paymentMode,
    totalAmount,
    onConfirm
}: PaymentStatusSelectorProps) {

    const [selectedStatus, setSelectedStatus] = useState<StatutPaiement | undefined>(undefined);
    const [partialAmount, setPartialAmount] = useState<string>("");

    const handleConfirm = () => {
        if (selectedStatus) {
            const pAmount = selectedStatus === "partiel" ? parseFloat(partialAmount) : undefined;
            onConfirm(selectedStatus, pAmount);
        }
    };

    return (
        <Card className="w-full shadow-lg border-t-4 border-t-violet-600 animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="text-center pb-2">
                <div className="mx-auto bg-violet-50 p-3 rounded-full w-fit mb-4 border border-violet-100">
                    <HelpCircle className="h-8 w-8 text-violet-600" />
                </div>
                <CardTitle className="text-xl text-slate-800 font-bold tracking-tight">Validation du Paiement</CardTitle>
                <CardDescription className="text-slate-500">
                    Avant de comptabiliser, confirmez le statut de cette pièce.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">

                {/* Indices détectés */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                        <AlertCircle className="h-4 w-4 text-violet-500" />
                        Indices détectés sur le document :
                    </div>
                    <div className="space-y-2">
                        {paymentIndices.length > 0 ? (
                            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 pl-1">
                                {paymentIndices.map((indice, idx) => (
                                    <li key={idx} className="truncate">{indice}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-400 italic">Aucun indice explicite de paiement trouvé.</p>
                        )}

                        {paymentMode && (
                            <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                                <span className="text-slate-500">Mode de paiement :</span>
                                <Badge variant="secondary" className="bg-white border border-slate-200 text-slate-700 font-medium rounded-md px-2">{paymentMode}</Badge>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sélection */}
                <div className="space-y-3">
                    <Label className="text-base font-semibold text-slate-800">
                        Quel est le statut réel ?
                    </Label>

                    <RadioGroup
                        onValueChange={(v) => setSelectedStatus(v as StatutPaiement)}
                        className="grid grid-cols-1 gap-3"
                    >
                        {/* Option 1: Non Payé */}
                        <label className={`
              flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all group
              ${selectedStatus === 'non_paye' ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-1 ring-amber-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
            `}>
                            <div className="flex items-center gap-4">
                                <RadioGroupItem value="non_paye" id="np" />
                                <div className="flex flex-col">
                                    <span className={`font-bold text-base ${selectedStatus === 'non_paye' ? 'text-amber-900' : 'text-slate-700'}`}>Non payé (À crédit)</span>
                                    <span className="text-xs text-slate-500">Génère une dette fournisseur ou créance client</span>
                                </div>
                            </div>
                            <Clock className={`h-6 w-6 ${selectedStatus === 'non_paye' ? 'text-amber-600' : 'text-slate-300 group-hover:text-slate-400'}`} />
                        </label>

                        {/* Option 2: Payé */}
                        <label className={`
              flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all group
              ${selectedStatus === 'paye' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
            `}>
                            <div className="flex items-center gap-4">
                                <RadioGroupItem value="paye" id="p" />
                                <div className="flex flex-col">
                                    <span className={`font-bold text-base ${selectedStatus === 'paye' ? 'text-emerald-900' : 'text-slate-700'}`}>Payé intégralement</span>
                                    <span className="text-xs text-slate-500">Règlement comptant, virement, espèces...</span>
                                </div>
                            </div>
                            <CheckCircle2 className={`h-6 w-6 ${selectedStatus === 'paye' ? 'text-emerald-600' : 'text-slate-300 group-hover:text-slate-400'}`} />
                        </label>

                        {/* Option 3: Partiel */}
                        <label className={`
              flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all group
              ${selectedStatus === 'partiel' ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
            `}>
                            <div className="flex items-center gap-4">
                                <RadioGroupItem value="partiel" id="part" />
                                <div className="flex flex-col">
                                    <span className={`font-bold text-base ${selectedStatus === 'partiel' ? 'text-blue-900' : 'text-slate-700'}`}>Paiement Partiel</span>
                                    <span className="text-xs text-slate-500">Un acompte a été versé</span>
                                </div>
                            </div>
                            <PieChart className={`h-6 w-6 ${selectedStatus === 'partiel' ? 'text-blue-600' : 'text-slate-300 group-hover:text-slate-400'}`} />
                        </label>
                    </RadioGroup>
                </div>

                {/* Input montant partiel */}
                {selectedStatus === "partiel" && (
                    <div className="animate-in slide-in-from-top-2 fade-in">
                        <Label htmlFor="partial" className="text-sm font-medium text-slate-700 mb-1.5 block">
                            Montant réglé ({totalAmount ? `Sur un total de ${totalAmount.toLocaleString()} FCFA` : "FCFA"})
                        </Label>
                        <div className="relative">
                            <Input
                                id="partial"
                                type="number"
                                placeholder="0"
                                value={partialAmount}
                                onChange={(e) => setPartialAmount(e.target.value)}
                                className="pl-4 pr-12 font-mono text-lg"
                            />
                            <span className="absolute right-4 top-2.5 text-slate-400 font-bold text-sm">FCFA</span>
                        </div>
                    </div>
                )}

                <Button
                    onClick={handleConfirm}
                    disabled={!selectedStatus || (selectedStatus === 'partiel' && !partialAmount)}
                    className="w-full mt-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-6 text-lg shadow-md transition-all hover:scale-[1.01]"
                >
                    Lancer l'analyse comptable
                    <CreditCard className="ml-2 h-5 w-5" />
                </Button>

            </CardContent>
        </Card>
    );
}
