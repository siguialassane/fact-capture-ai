/**
 * PaymentStatusSelector Component
 * 
 * Permet à l'utilisateur de confirmer le statut de paiement avant la génération comptable
 */

import {
    CreditCard,
    Clock,
    CircleDollarSign,
    HelpCircle,
    Check,
    AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export type StatutPaiement = "paye" | "non_paye" | "partiel" | "inconnu";

interface PaymentStatusSelectorProps {
    /** Statut suggéré par l'IA (Qwen) */
    suggestedStatus?: StatutPaiement;
    /** Indices de paiement détectés par l'IA */
    paymentIndices?: string[];
    /** Mode de paiement détecté */
    paymentMode?: string;
    /** Montant total de la facture */
    totalAmount?: number;
    /** Callback quand l'utilisateur confirme le statut */
    onConfirm: (status: StatutPaiement, partialAmount?: number) => void;
    /** Pour annuler/retourner */
    onCancel?: () => void;
}

export function PaymentStatusSelector({
    suggestedStatus = "inconnu",
    paymentIndices = [],
    paymentMode,
    totalAmount,
    onConfirm,
    onCancel,
}: PaymentStatusSelectorProps) {
    const [selectedStatus, setSelectedStatus] = useState<StatutPaiement>(suggestedStatus);
    const [partialAmount, setPartialAmount] = useState<number>(0);

    const statusOptions: {
        value: StatutPaiement;
        label: string;
        description: string;
        icon: React.ReactNode;
        color: string;
    }[] = [
            {
                value: "paye",
                label: "✅ Paiement reçu",
                description: "Le paiement a déjà été effectué (virement reçu, chèque encaissé, etc.)",
                icon: <Check className="h-5 w-5" />,
                color: "border-emerald-500 bg-emerald-50 text-emerald-700",
            },
            {
                value: "non_paye",
                label: "⏳ Non payé (à crédit)",
                description: "Le client doit encore payer, créance à enregistrer",
                icon: <Clock className="h-5 w-5" />,
                color: "border-amber-500 bg-amber-50 text-amber-700",
            },
            {
                value: "partiel",
                label: "💰 Paiement partiel",
                description: "Une partie du montant a été payée, le reste est dû",
                icon: <CircleDollarSign className="h-5 w-5" />,
                color: "border-blue-500 bg-blue-50 text-blue-700",
            },
            {
                value: "inconnu",
                label: "❓ Je ne sais pas",
                description: "L'IA fera une supposition basée sur les indices",
                icon: <HelpCircle className="h-5 w-5" />,
                color: "border-slate-400 bg-slate-50 text-slate-600",
            },
        ];

    const handleConfirm = () => {
        onConfirm(selectedStatus, selectedStatus === "partiel" ? partialAmount : undefined);
    };

    return (
        <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-violet-800">
                    <CreditCard className="h-5 w-5" />
                    Confirmez le statut du paiement
                </CardTitle>
                <p className="text-sm text-violet-600 mt-1">
                    Cette information est cruciale pour générer la bonne écriture comptable
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Indices détectés par l'IA */}
                {(paymentIndices.length > 0 || paymentMode) && (
                    <div className="bg-white p-3 rounded-lg border border-violet-200">
                        <div className="text-sm font-medium text-violet-700 mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Indices détectés par l'IA :
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {paymentMode && (
                                <Badge variant="outline" className="bg-violet-100 text-violet-700">
                                    Mode: {paymentMode}
                                </Badge>
                            )}
                            {paymentIndices.map((indice, i) => (
                                <Badge key={i} variant="outline" className="bg-slate-100">
                                    {indice}
                                </Badge>
                            ))}
                        </div>
                        {suggestedStatus !== "inconnu" && (
                            <div className="mt-2 text-sm text-violet-600">
                                💡 Suggestion de l'IA : <strong>{statusOptions.find(o => o.value === suggestedStatus)?.label}</strong>
                            </div>
                        )}
                    </div>
                )}

                {/* Options de statut */}
                <div className="space-y-3">
                    {statusOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setSelectedStatus(option.value)}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${selectedStatus === option.value
                                    ? option.color + " ring-2 ring-offset-2 ring-violet-300"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${selectedStatus === option.value ? "bg-white/50" : "bg-slate-100"}`}>
                                    {option.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-sm opacity-75">{option.description}</div>
                                </div>
                                {selectedStatus === option.value && (
                                    <Check className="h-5 w-5" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Champ montant partiel */}
                {selectedStatus === "partiel" && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
                        <Label htmlFor="partial-amount" className="text-blue-700 font-medium">
                            Montant déjà payé (FCFA)
                        </Label>
                        <Input
                            id="partial-amount"
                            type="number"
                            value={partialAmount}
                            onChange={(e) => setPartialAmount(Number(e.target.value))}
                            placeholder="Ex: 1 000 000"
                            className="text-lg font-mono"
                        />
                        {totalAmount && totalAmount > 0 && (
                            <div className="text-sm text-blue-600">
                                Total facture : <strong>{totalAmount.toLocaleString("fr-FR")} FCFA</strong>
                                {partialAmount > 0 && (
                                    <span className="ml-2">
                                        → Reste dû : <strong>{(totalAmount - partialAmount).toLocaleString("fr-FR")} FCFA</strong>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-3 pt-4">
                    {onCancel && (
                        <Button variant="outline" onClick={onCancel} className="flex-1">
                            Annuler
                        </Button>
                    )}
                    <Button
                        onClick={handleConfirm}
                        className="flex-1 bg-violet-600 hover:bg-violet-700"
                    >
                        Confirmer et générer l'écriture
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
