import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Article {
  designation: string;
  quantite: string;
  unite?: string;
  prix_unitaire?: string;
  prix_unitaire_ht?: string;
  taux_tva?: string;
  montant_tva?: string;
  montant_ht?: string;
  montant_ttc?: string;
  total?: string; // Compatibilité - sera deprecated
}

interface ArticlesTableProps {
  articles: Article[];
  onArticleChange: (index: number, field: string, value: string) => void;
  totalHT?: string;
  totalTVA?: string;
  totalTTC?: string;
}

export function ArticlesTable({
  articles,
  onArticleChange,
  totalHT,
  totalTVA,
  totalTTC
}: ArticlesTableProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Helper pour nettoyer et parser les montants (ex: "15,00 €" -> 15.00)
  const parseAmount = (val: unknown): number => {
    if (!val) return 0;
    // Si c'est déjà un nombre, le retourner
    if (typeof val === 'number') return val;
    // Si ce n'est pas une string, essayer de convertir
    if (typeof val !== 'string') {
      const str = String(val);
      return parseFloat(str.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
    }
    return parseFloat(val.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
  };

  // Helper pour formater en devise (ex: 15.00 -> "15,00 €")
  // Note: On essaie de garder le symbole d'origine si possible, sinon € par défaut
  const formatAmount = (val: number) => {
    return val.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; // Simplifié pour l'exemple
  };

  // Helper pour obtenir le montant TTC d'une ligne (montant_ttc ou total)
  const getLineTTC = (a: Article) => parseAmount(a.montant_ttc || a.total || "0");
  const getLineHT = (a: Article) => parseAmount(a.montant_ht || "0");

  // Recalcul en temps réel des totaux basés sur les articles
  const sumTotalROW = articles.reduce((acc, a) => acc + getLineTTC(a), 0);
  const sumTvaROW = articles.reduce((acc, a) => acc + parseAmount(a.montant_tva || "0"), 0);
  const sumHtROW = articles.reduce((acc, a) => acc + getLineHT(a), 0) || (sumTotalROW - sumTvaROW);

  // Détection des colonnes à afficher (logique améliorée)
  const hasUnite = articles.some(a => a.unite && a.unite !== "undefined");
  const hasTVA = articles.some(a => (a.taux_tva && a.taux_tva !== "undefined" && a.taux_tva !== "0" && a.taux_tva !== "0%") || 
                                    (a.montant_tva && a.montant_tva !== "undefined" && parseAmount(a.montant_tva) > 0));
  
  // Prix unitaire: on fusionne si prix_unitaire et prix_unitaire_ht sont identiques ou si un seul existe
  const getPrixUnitaire = (a: Article): string => {
    const pu = a.prix_unitaire;
    const puHt = a.prix_unitaire_ht;
    // Retourne celui qui existe, ou le premier si les deux existent
    return pu || puHt || "";
  };
  
  // Vérifier si on a des prix HT différents des prix unitaires (pour afficher 2 colonnes)
  const hasDifferentHT = articles.some(a => {
    if (!a.prix_unitaire || !a.prix_unitaire_ht) return false;
    const pu = parseAmount(a.prix_unitaire);
    const puHt = parseAmount(a.prix_unitaire_ht);
    return Math.abs(pu - puHt) > 0.01; // Différence significative
  });
  
  // Montant HT par ligne (différent du prix unitaire * qté)
  const hasMontantHT = articles.some(a => a.montant_ht && a.montant_ht !== "undefined" && parseAmount(a.montant_ht) > 0);

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Barre d'outils au-dessus du tableau */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-primary border-primary/20 hover:bg-primary/5"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier le tableau complet
          </Button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-white shadow-sm">
          {/* Tableau Lecture Seule */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                  {/* Description */}
                  <TableHead className="font-bold text-slate-800 min-w-[200px] px-6 py-3 text-left">Description</TableHead>

                  {/* Quantité */}
                  <TableHead className="font-bold text-slate-800 text-center w-[80px] px-2 py-3 whitespace-nowrap">Qté</TableHead>

                  {hasUnite && <TableHead className="font-bold text-slate-800 text-center w-[80px] px-2 py-3 whitespace-nowrap">Unité</TableHead>}

                  {/* Prix Unitaire (fusionné ou séparé selon les données) */}
                  <TableHead className="font-bold text-slate-800 text-right w-[110px] px-2 py-3 whitespace-nowrap">
                    {hasDifferentHT ? "P.U. TTC" : "P.U. HT"}
                  </TableHead>

                  {hasDifferentHT && <TableHead className="font-bold text-slate-800 text-right w-[110px] px-2 py-3 whitespace-nowrap">P.U. HT</TableHead>}

                  {hasMontantHT && <TableHead className="font-bold text-slate-800 text-right w-[110px] px-2 py-3 whitespace-nowrap">Montant HT</TableHead>}

                  {hasTVA && (
                    <>
                      <TableHead className="font-bold text-slate-800 text-center w-[80px] px-2 py-3 whitespace-nowrap">% TVA</TableHead>
                      <TableHead className="font-bold text-slate-800 text-right w-[110px] px-2 py-3 whitespace-nowrap">Montant TVA</TableHead>
                    </>
                  )}

                  <TableHead className="font-bold text-slate-800 text-right w-[130px] px-6 py-3 bg-slate-100/50 whitespace-nowrap">Total TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article, index) => (
                  <TableRow key={index} className="hover:bg-slate-50/50 border-b border-slate-100 last:border-0">
                    <TableCell className="px-6 py-3 align-top font-medium text-slate-700">{article.designation}</TableCell>
                    <TableCell className="text-center px-2 py-3 align-top text-slate-600 font-mono">{article.quantite}</TableCell>
                    {hasUnite && <TableCell className="text-center px-2 py-3 align-top text-slate-500 text-sm">{article.unite}</TableCell>}
                    <TableCell className="text-right px-2 py-3 align-top text-slate-600 font-mono whitespace-nowrap">{getPrixUnitaire(article)}</TableCell>
                    {hasDifferentHT && <TableCell className="text-right px-2 py-3 align-top text-slate-500 font-mono whitespace-nowrap">{article.prix_unitaire_ht}</TableCell>}
                    {hasMontantHT && <TableCell className="text-right px-2 py-3 align-top text-slate-500 font-mono whitespace-nowrap">{article.montant_ht}</TableCell>}
                    {hasTVA && (
                      <>
                        <TableCell className="text-center px-2 py-3 align-top text-slate-500 text-sm whitespace-nowrap">{article.taux_tva}</TableCell>
                        <TableCell className="text-right px-2 py-3 align-top text-slate-500 text-sm font-mono whitespace-nowrap">{article.montant_tva}</TableCell>
                      </>
                    )}
                    <TableCell className="text-right px-6 py-3 align-top font-bold text-slate-900 bg-slate-50/30 font-mono whitespace-nowrap">{article.montant_ttc || article.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer avec Totaux Recalculés */}
          <div className="bg-slate-50 border-t border-slate-200 p-4">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center justify-between w-[250px] text-sm">
                <span className="font-bold text-slate-600">Total HT (Calculé)</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatAmount(sumHtROW)}
                </span>
              </div>

              <div className="flex items-center justify-between w-[250px] text-sm">
                <span className="font-bold text-slate-600">Total TVA (Calculé)</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatAmount(sumTvaROW)}
                </span>
              </div>

              <div className="flex items-center justify-between w-[250px] text-lg mt-2 pt-2 border-t border-slate-300">
                <span className="font-bold text-emerald-700">Total TTC</span>
                <span className="font-extrabold text-emerald-700 font-mono">
                  {formatAmount(sumTotalROW)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'édition */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Modifier le tableau des articles</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto border rounded-md mt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 sticky top-0 z-10">
                  <TableHead className="min-w-[300px]">Désignation</TableHead>
                  <TableHead className="w-[100px]">Qté</TableHead>
                  <TableHead className="w-[80px]">Unité</TableHead>
                  <TableHead className="w-[120px] text-right">P.U.</TableHead>
                  {hasMontantHT && <TableHead className="w-[120px] text-right">Montant HT</TableHead>}
                  <TableHead className="w-[120px] text-right">Total TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={article.designation}
                        onChange={(e) => onArticleChange(index, 'designation', e.target.value)}
                        className="min-w-[200px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={article.quantite}
                        onChange={(e) => onArticleChange(index, 'quantite', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={article.unite || ''}
                        placeholder="-"
                        onChange={(e) => onArticleChange(index, 'unite', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={article.prix_unitaire || article.prix_unitaire_ht || ''}
                        onChange={(e) => onArticleChange(index, 'prix_unitaire', e.target.value)}
                        className="text-right"
                      />
                    </TableCell>
                    {hasMontantHT && (
                      <TableCell>
                        <Input
                          value={article.montant_ht || ''}
                          onChange={(e) => onArticleChange(index, 'montant_ht', e.target.value)}
                          className="text-right"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Input
                        className="text-right font-bold"
                        value={article.montant_ttc || article.total || ''}
                        onChange={(e) => onArticleChange(index, 'total', e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-4 border-t pt-4">
            {/* Petit récapitulatif dans le modal aussi */}
            <div className="mr-auto text-sm text-muted-foreground flex gap-4">
              <span>Total TTC Calculé: <span className="font-bold text-foreground">{formatAmount(sumTotalROW)}</span></span>
            </div>
            <Button onClick={() => setIsEditModalOpen(false)}>
              <Check className="w-4 h-4 mr-2" />
              Terminer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
