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
  prix_unitaire: string;
  prix_unitaire_ht?: string;
  taux_tva?: string;
  montant_tva?: string;
  total: string;
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
  const parseAmount = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
  };

  // Helper pour formater en devise (ex: 15.00 -> "15,00 €")
  // Note: On essaie de garder le symbole d'origine si possible, sinon € par défaut
  const formatAmount = (val: number) => {
    return val.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; // Simplifié pour l'exemple
  };

  // Recalcul en temps réel des totaux basés sur les articles affichés/modifiés
  const calculatedTotalHT = articles.reduce((sum, item) => {
    // Si on a un PU HT, on l'utilise, sinon on déduit du total ligne ?
    // Plus simple : on se base sur le TOTAL ligne qui est souvent ce qui compte le plus
    // Mais attention, "total" dans l'article est souvent TTC.
    // L'IA met le total dans item.total.
    // Si on veut le HT, il faut voir si item.total est HT ou TTC.
    // C'est complexe sans connaitre la logique de l'IA.
    // HYPOTHESE : item.total est le montant final de la ligne (souvent TTC).
    return sum + parseAmount(item.total);
  }, 0);

  // Pour le recalcul exact, c'est mieux de faire confiance à l'IA pour l'initial,
  // mais si on édite, on doit faire des maths simples.
  // ICI : On va afficher les totaux recalculés SI on est en train d'éditer ou si les données changent.
  // Cependant, pour l'affichage statique, on garde sum des colonnes.

  const sumTotalROW = articles.reduce((acc, a) => acc + parseAmount(a.total), 0);
  const sumTvaROW = articles.reduce((acc, a) => acc + parseAmount(a.montant_tva || "0"), 0);
  // Estimation du HT global par soustraction si non dispo
  const sumHtROW = sumTotalROW - sumTvaROW;

  // Détection des colonnes à afficher
  const hasUnite = articles.some(a => a.unite && a.unite !== "undefined");
  const hasHT = articles.some(a => a.prix_unitaire_ht && a.prix_unitaire_ht !== "undefined");
  const hasTVA = articles.some(a => (a.taux_tva && a.taux_tva !== "undefined") || (a.montant_tva && a.montant_tva !== "undefined"));

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
                  {/* Description: Flex ou min-width raisonnable, pas trop grand */}
                  <TableHead className="font-bold text-slate-800 min-w-[200px] px-6 py-3 text-left">Description</TableHead>

                  {/* Colonnes chiffres: Largeur fixe suffisante + whitespace-nowrap */}
                  <TableHead className="font-bold text-slate-800 text-center w-[80px] px-2 py-3 whitespace-nowrap">Qté</TableHead>

                  {hasUnite && <TableHead className="font-bold text-slate-800 text-center w-[80px] px-2 py-3 whitespace-nowrap">Unité</TableHead>}

                  <TableHead className="font-bold text-slate-800 text-right w-[110px] px-2 py-3 whitespace-nowrap">Prix Unit.</TableHead>

                  {hasHT && <TableHead className="font-bold text-slate-800 text-right w-[110px] px-2 py-3 whitespace-nowrap">P.U. HT</TableHead>}

                  {hasTVA && (
                    <>
                      <TableHead className="font-bold text-slate-800 text-center w-[80px] px-2 py-3 whitespace-nowrap">% TVA</TableHead>
                      <TableHead className="font-bold text-slate-800 text-right w-[110px] px-2 py-3 whitespace-nowrap">Total TVA</TableHead>
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
                    <TableCell className="text-right px-2 py-3 align-top text-slate-600 font-mono whitespace-nowrap">{article.prix_unitaire}</TableCell>
                    {hasHT && <TableCell className="text-right px-2 py-3 align-top text-slate-500 font-mono whitespace-nowrap">{article.prix_unitaire_ht}</TableCell>}
                    {hasTVA && (
                      <>
                        <TableCell className="text-center px-2 py-3 align-top text-slate-500 text-sm whitespace-nowrap">{article.taux_tva}</TableCell>
                        <TableCell className="text-right px-2 py-3 align-top text-slate-500 text-sm font-mono whitespace-nowrap">{article.montant_tva}</TableCell>
                      </>
                    )}
                    <TableCell className="text-right px-6 py-3 align-top font-bold text-slate-900 bg-slate-50/30 font-mono whitespace-nowrap">{article.total}</TableCell>
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
                  {hasHT && <TableHead className="w-[120px] text-right">P.U. HT</TableHead>}
                  <TableHead className="w-[120px] text-right">Total</TableHead>
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
                        value={article.prix_unitaire}
                        onChange={(e) => onArticleChange(index, 'prix_unitaire', e.target.value)}
                        className="text-right"
                      />
                    </TableCell>
                    {hasHT && (
                      <TableCell>
                        <Input
                          value={article.prix_unitaire_ht || ''}
                          onChange={(e) => onArticleChange(index, 'prix_unitaire_ht', e.target.value)}
                          className="text-right"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Input
                        className="text-right font-bold"
                        value={article.total}
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
