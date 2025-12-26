import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { List, ShoppingCart, Receipt } from "lucide-react";
import { ArticlesTable } from "../desktop/ArticlesTable";
import type { FlexibleInvoiceAIResult } from "@/lib/openrouter";

interface InvoiceArticlesListProps {
    invoiceData?: FlexibleInvoiceAIResult;
    onArticleChange?: (index: number, field: string, value: string) => void;
}

export function InvoiceArticlesList({ invoiceData, onArticleChange }: InvoiceArticlesListProps) {

    const articles = (invoiceData as any)?.articles || [];

    const handleArticleChange = onArticleChange || ((index, field, value) => {
        // No-op if not provided
    });

    return (
        <div className="h-full flex flex-col bg-slate-50/30 overflow-hidden border-l border-slate-200">
            {/* Header PRO - Sans AI mention */}
            <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-sidebar-border/50 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <Receipt className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Détails de la Facture</h2>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            Liste des produits et services identifiés
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-6 bg-slate-50/30">
                <Card className="border shadow-none h-full flex flex-col bg-white overflow-hidden rounded-xl">
                    <CardHeader className="bg-white border-b border-slate-100 py-4 px-6">
                        <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                            <List className="h-4 w-4 text-slate-400" />
                            Lignes de facturation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-auto bg-white">
                        {articles.length > 0 ? (
                            <div className="h-full overflow-auto">
                                {/* Le composant ArticlesTable gère son propre affichage */}
                                <ArticlesTable
                                    articles={articles}
                                    onArticleChange={handleArticleChange}
                                    totalHT={(invoiceData as any)?.total_ht}
                                    totalTVA={(invoiceData as any)?.total_tva || (invoiceData as any)?.tva}
                                    totalTTC={(invoiceData as any)?.montant_total}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <ShoppingCart className="h-12 w-12 opacity-10 mb-3" />
                                <p className="font-medium text-slate-500">Aucun article détecté</p>
                                <p className="text-sm text-slate-400">Les lignes n'ont pas pu être extraites.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
