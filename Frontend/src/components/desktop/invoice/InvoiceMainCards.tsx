/**
 * InvoiceMainCards - Cartes d'informations principales de la facture
 */

import {
    Receipt,
    Building2,
    Calendar,
    Hash,
    Wallet,
    Clock,
    CreditCard,
} from "lucide-react";
import { EditableField } from "@/components/ui/editable-field";
import type { FlexibleInvoiceAIResult } from "@/lib/openrouter";

interface InvoiceMainCardsProps {
    data: FlexibleInvoiceAIResult;
    onDataChange: (field: string, value: string) => void;
}

export function InvoiceMainCards({ data, onDataChange }: InvoiceMainCardsProps) {
    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Montant Total - Hero Card */}
            <div className="col-span-2 p-6 rounded-2xl bg-white border border-violet-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute -right-6 -top-6 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rotate-12">
                    <Receipt className="w-40 h-40 text-violet-900" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-violet-600/80 uppercase tracking-wider">Montant Net à Payer</p>
                        {data.devise_origine && data.devise_origine !== "XOF" && (
                            <span className="text-xs font-bold bg-violet-50 text-violet-700 px-2.5 py-1 rounded-md border border-violet-100">
                                Devise: {data.devise_origine}
                            </span>
                        )}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <EditableField
                            value={data.montant_total}
                            onSave={(val) => onDataChange("montant_total", val)}
                            className="text-4xl font-bold text-slate-800 tracking-tight"
                        />
                    </div>
                    {data.montant_fcfa && (
                        <div className="mt-2 text-sm font-medium text-emerald-600 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            Soit {data.montant_fcfa} FCFA
                        </div>
                    )}
                </div>
            </div>

            {/* Fournisseur */}
            <InfoCard
                icon={<Building2 className="h-4 w-4" />}
                label="Fournisseur"
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
            >
                <EditableField
                    value={data.fournisseur}
                    onSave={(val) => onDataChange("fournisseur", val)}
                    className="font-semibold text-slate-700 text-lg truncate block"
                />
            </InfoCard>

            {/* Date */}
            <InfoCard
                icon={<Calendar className="h-4 w-4" />}
                label="Date"
                iconBg="bg-orange-50"
                iconColor="text-orange-600"
            >
                <EditableField
                    value={data.date_facture}
                    onSave={(val) => onDataChange("date_facture", val)}
                    className="font-medium text-slate-700"
                />
            </InfoCard>

            {/* Facture N° */}
            <InfoCard
                icon={<Hash className="h-4 w-4" />}
                label="N° Pièce"
                iconBg="bg-purple-50"
                iconColor="text-purple-600"
            >
                <EditableField
                    value={data.numero_facture}
                    onSave={(val) => onDataChange("numero_facture", val)}
                    className="font-mono font-medium text-slate-700"
                />
            </InfoCard>

            {/* TVA / Taxes */}
            <InfoCard
                icon={<Receipt className="h-4 w-4" />}
                label="TVA Globale"
                iconBg="bg-slate-100"
                iconColor="text-slate-600"
            >
                <EditableField
                    value={data.tva}
                    onSave={(val) => onDataChange("tva", val)}
                    className="font-medium text-slate-700"
                />
            </InfoCard>

            {/* Total HT */}
            {data.total_ht && (
                <InfoCard
                    icon={<Wallet className="h-4 w-4" />}
                    label="Total HT"
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                >
                    <EditableField
                        value={data.total_ht}
                        onSave={(val) => onDataChange("total_ht", val)}
                        className="font-medium text-slate-700"
                    />
                </InfoCard>
            )}

            {/* Date d'échéance */}
            {data.date_echeance && (
                <InfoCard
                    icon={<Clock className="h-4 w-4" />}
                    label="Date échéance"
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                >
                    <EditableField
                        value={data.date_echeance}
                        onSave={(val) => onDataChange("date_echeance", val)}
                        className="font-medium text-slate-700"
                    />
                </InfoCard>
            )}

            {/* Mode de paiement */}
            {data.mode_paiement && (
                <InfoCard
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Mode paiement"
                    iconBg="bg-cyan-50"
                    iconColor="text-cyan-600"
                >
                    <EditableField
                        value={data.mode_paiement}
                        onSave={(val) => onDataChange("mode_paiement", val)}
                        className="font-medium text-slate-700"
                    />
                </InfoCard>
            )}
        </div>
    );
}

// Composant interne pour les cartes d'info
interface InfoCardProps {
    icon: React.ReactNode;
    label: string;
    iconBg: string;
    iconColor: string;
    children: React.ReactNode;
}

function InfoCard({ icon, label, iconBg, iconColor, children }: InfoCardProps) {
    return (
        <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-violet-200 transition-colors group">
            <div className="flex items-center gap-2.5 mb-2">
                <div className={`p-1.5 rounded-lg ${iconBg} ${iconColor} group-hover:opacity-80 transition-colors`}>
                    {icon}
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
            {children}
        </div>
    );
}
