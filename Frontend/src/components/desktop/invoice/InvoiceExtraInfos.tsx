/**
 * InvoiceExtraInfos - Sections TVA détails, données manquantes, infos complémentaires, alertes
 */

import { Receipt, AlertCircle, Info, MessageSquare, AlertTriangle } from "lucide-react";
import { EditableField } from "@/components/ui/editable-field";
import type { FlexibleInvoiceAIResult } from "@/lib/openrouter";

interface InvoiceExtraInfosProps {
    data: FlexibleInvoiceAIResult;
    onDataChange: (field: string, value: string) => void;
}

export function InvoiceExtraInfos({ data, onDataChange }: InvoiceExtraInfosProps) {
    return (
        <>
            {/* Détails TVA si multiples taux */}
            {data.tva_details && data.tva_details.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Détails TVA
                    </h3>
                    <div className="space-y-2">
                        {data.tva_details.map((detail, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-slate-100">
                                <span className="text-sm text-slate-600">Taux {detail.taux}</span>
                                <span className="text-sm text-slate-500">Base: {detail.base_ht}</span>
                                <span className="font-medium text-slate-700">{detail.montant_tva}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Données manquantes */}
            {data.donnees_manquantes && data.donnees_manquantes.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <h3 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Données manquantes ou incomplètes
                    </h3>
                    <ul className="space-y-1">
                        {data.donnees_manquantes.map((item, index) => (
                            <li key={index} className="text-amber-700 text-sm flex items-start gap-2">
                                <span className="text-amber-400">•</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Infos complémentaires */}
            {data.infos_complementaires && Object.keys(data.infos_complementaires).length > 0 && (
                <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
                    <h3 className="font-semibold text-violet-700 mb-3 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Informations complémentaires
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(data.infos_complementaires).map(([key, value]) => (
                            <div key={key} className="bg-white rounded-lg p-3 border border-violet-100">
                                <div className="text-xs text-violet-600 mb-1">{key}</div>
                                <div className="font-medium text-sm text-slate-700">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Extra fields */}
            {data.extra_fields && Object.keys(data.extra_fields).length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Informations supplémentaires
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(data.extra_fields).map(([key, value]) => (
                            <div key={key} className="bg-white rounded-lg p-3 border border-blue-100">
                                <div className="text-xs text-blue-600 mb-1">{key}</div>
                                <EditableField
                                    value={value}
                                    onSave={(val) => {
                                        const newExtraFields = { ...data.extra_fields, [key]: val };
                                        onDataChange("extra_fields", JSON.stringify(newExtraFields));
                                    }}
                                    className="font-medium text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Comment */}
            {data.ai_comment && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                    <h3 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Commentaire IA
                    </h3>
                    <p className="text-amber-800 text-sm leading-relaxed">{data.ai_comment}</p>
                </div>
            )}

            {/* Anomalies */}
            {data.anomalies && data.anomalies.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Anomalies détectées
                    </h3>
                    <ul className="space-y-1">
                        {data.anomalies.map((anomaly, index) => (
                            <li key={index} className="text-red-700 text-sm flex items-start gap-2">
                                <span className="text-red-400">•</span>
                                {anomaly}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
}
