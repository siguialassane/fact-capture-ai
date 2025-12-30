/**
 * InvoiceAddresses - Section adresses fournisseur et client
 */

import { MapPin, User, Phone, Mail } from "lucide-react";
import { EditableField } from "@/components/ui/editable-field";
import type { FlexibleInvoiceAIResult } from "@/lib/openrouter";

interface InvoiceAddressesProps {
    data: FlexibleInvoiceAIResult;
    onDataChange: (field: string, value: string) => void;
}

export function InvoiceAddresses({ data, onDataChange }: InvoiceAddressesProps) {
    if (!data.adresse_fournisseur && !data.adresse_client && !data.client) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fournisseur avec adresse */}
            {data.adresse_fournisseur && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                            <MapPin className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Adresse Fournisseur</span>
                    </div>
                    <EditableField
                        value={data.adresse_fournisseur}
                        onSave={(val) => onDataChange("adresse_fournisseur", val)}
                        className="text-sm text-slate-700 leading-relaxed"
                    />
                    {/* Contact fournisseur */}
                    <div className="mt-2 pt-2 border-t border-blue-200/50 space-y-1">
                        {data.telephone_fournisseur && (
                            <div className="flex items-center gap-2 text-xs text-blue-700">
                                <Phone className="h-3 w-3" />
                                <span>{data.telephone_fournisseur}</span>
                            </div>
                        )}
                        {data.email_fournisseur && (
                            <div className="flex items-center gap-2 text-xs text-blue-700">
                                <Mail className="h-3 w-3" />
                                <span>{data.email_fournisseur}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Client avec adresse */}
            {(data.client || data.adresse_client) && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="p-1.5 rounded-lg bg-green-100 text-green-600">
                            <User className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Client</span>
                    </div>
                    {data.client && (
                        <EditableField
                            value={data.client}
                            onSave={(val) => onDataChange("client", val)}
                            className="font-semibold text-slate-700 mb-2"
                        />
                    )}
                    {data.adresse_client && (
                        <EditableField
                            value={data.adresse_client}
                            onSave={(val) => onDataChange("adresse_client", val)}
                            className="text-sm text-slate-600 leading-relaxed"
                        />
                    )}
                </div>
            )}
        </div>
    );
}
