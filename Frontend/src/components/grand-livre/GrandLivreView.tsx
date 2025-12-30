/**
 * Vue Grand Livre
 * 
 * Consultation des mouvements par compte avec soldes cumulés
 */

import { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  ChevronRight,
  ChevronDown,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Calendar,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getComptesWithSoldes,
  getGrandLivreCompte,
  type GrandLivreAccount,
  type GrandLivreDetail,
} from "@/lib/api/backend-client";

// Couleurs par classe de compte
const CLASSE_COLORS: Record<string, { bg: string; text: string }> = {
  "1": { bg: "bg-purple-100", text: "text-purple-700" },
  "2": { bg: "bg-blue-100", text: "text-blue-700" },
  "3": { bg: "bg-cyan-100", text: "text-cyan-700" },
  "4": { bg: "bg-amber-100", text: "text-amber-700" },
  "5": { bg: "bg-green-100", text: "text-green-700" },
  "6": { bg: "bg-red-100", text: "text-red-700" },
  "7": { bg: "bg-emerald-100", text: "text-emerald-700" },
  "8": { bg: "bg-slate-100", text: "text-slate-700" },
};

const CLASSE_NAMES: Record<string, string> = {
  "1": "Capitaux",
  "2": "Immobilisations",
  "3": "Stocks",
  "4": "Tiers",
  "5": "Trésorerie",
  "6": "Charges",
  "7": "Produits",
  "8": "Comptes spéciaux",
};

export function GrandLivreView() {
  const [comptes, setComptes] = useState<GrandLivreAccount[]>([]);
  const [selectedCompte, setSelectedCompte] = useState<string | null>(null);
  const [compteDetail, setCompteDetail] = useState<GrandLivreDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set(["4", "6", "7"]));

  // Charger les comptes
  useEffect(() => {
    async function loadComptes() {
      setLoading(true);
      try {
        const data = await getComptesWithSoldes({ avecMouvements: true });
        setComptes(data);
      } catch (error) {
        console.error("Erreur chargement comptes:", error);
      } finally {
        setLoading(false);
      }
    }
    loadComptes();
  }, []);

  // Charger le détail d'un compte
  useEffect(() => {
    async function loadDetail() {
      if (!selectedCompte) {
        setCompteDetail(null);
        return;
      }

      setLoadingDetail(true);
      try {
        const data = await getGrandLivreCompte(selectedCompte, { inclureLettres: true });
        setCompteDetail(data);
      } catch (error) {
        console.error("Erreur chargement détail:", error);
      } finally {
        setLoadingDetail(false);
      }
    }
    loadDetail();
  }, [selectedCompte]);

  // Grouper les comptes par classe
  const comptesParClasse = comptes.reduce((acc, compte) => {
    const classe = compte.classe || compte.numero_compte.charAt(0);
    if (!acc[classe]) acc[classe] = [];
    acc[classe].push(compte);
    return acc;
  }, {} as Record<string, GrandLivreAccount[]>);

  // Filtrer les comptes
  const filteredComptes = searchQuery
    ? comptes.filter(
        (c) =>
          c.numero_compte.includes(searchQuery) ||
          c.libelle_compte.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const toggleClasse = (classe: string) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classe)) {
      newExpanded.delete(classe);
    } else {
      newExpanded.add(classe);
    }
    setExpandedClasses(newExpanded);
  };

  const formatMontant = (montant: number) => {
    return montant.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const SoldeIcon = ({ sens }: { sens: string }) => {
    if (sens === "debiteur") return <TrendingUp className="h-4 w-4 text-blue-500" />;
    if (sens === "crediteur") return <TrendingDown className="h-4 w-4 text-emerald-500" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Liste des comptes (gauche) */}
      <div className="w-1/3 border-r overflow-auto">
        <div className="p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            <h2 className="font-bold text-lg">Grand Livre</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher un compte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="p-2">
          {searchQuery && filteredComptes ? (
            // Résultats de recherche
            <div className="space-y-1">
              {filteredComptes.map((compte) => (
                <CompteRow
                  key={compte.numero_compte}
                  compte={compte}
                  isSelected={selectedCompte === compte.numero_compte}
                  onClick={() => setSelectedCompte(compte.numero_compte)}
                />
              ))}
              {filteredComptes.length === 0 && (
                <p className="text-center text-slate-400 py-4">Aucun compte trouvé</p>
              )}
            </div>
          ) : (
            // Liste par classe
            Object.entries(comptesParClasse)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([classe, comptesClasse]) => (
                <Collapsible
                  key={classe}
                  open={expandedClasses.has(classe)}
                  onOpenChange={() => toggleClasse(classe)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div
                      className={`flex items-center justify-between p-2 rounded-lg mb-1 ${CLASSE_COLORS[classe]?.bg || "bg-slate-100"}`}
                    >
                      <div className="flex items-center gap-2">
                        {expandedClasses.has(classe) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-semibold">
                          Classe {classe} - {CLASSE_NAMES[classe] || "Autres"}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {comptesClasse.length}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-4 space-y-1 mb-2">
                      {comptesClasse.map((compte) => (
                        <CompteRow
                          key={compte.numero_compte}
                          compte={compte}
                          isSelected={selectedCompte === compte.numero_compte}
                          onClick={() => setSelectedCompte(compte.numero_compte)}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
          )}
        </div>
      </div>

      {/* Détail du compte (droite) */}
      <div className="flex-1 overflow-auto">
        {loadingDetail ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : compteDetail ? (
          <div className="p-4">
            {/* En-tête du compte */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="font-mono text-violet-600">
                        {compteDetail.compte.numero_compte}
                      </span>
                      <span>{compteDetail.compte.libelle_compte}</span>
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span>{compteDetail.compte.nb_mouvements} mouvements</span>
                      <span>•</span>
                      <span>Classe {compteDetail.compte.classe}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <SoldeIcon sens={compteDetail.compte.sens_solde} />
                      <span
                        className={`text-2xl font-bold ${
                          compteDetail.compte.sens_solde === "debiteur"
                            ? "text-blue-600"
                            : compteDetail.compte.sens_solde === "crediteur"
                            ? "text-emerald-600"
                            : "text-slate-400"
                        }`}
                      >
                        {formatMontant(Math.abs(compteDetail.compte.solde))}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      Solde {compteDetail.compte.sens_solde}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-blue-600 font-bold text-lg">
                      {formatMontant(compteDetail.compte.total_debit)}
                    </div>
                    <div className="text-xs text-blue-500">Total Débit</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-emerald-600 font-bold text-lg">
                      {formatMontant(compteDetail.compte.total_credit)}
                    </div>
                    <div className="text-xs text-emerald-500">Total Crédit</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-slate-700 font-bold text-lg">
                      {compteDetail.mouvements.length}
                    </div>
                    <div className="text-xs text-slate-500">Écritures</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tableau des mouvements */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Mouvements</CardTitle>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead className="w-[60px]">Jnl</TableHead>
                        <TableHead className="w-[130px]">N° Pièce</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead className="text-right w-[120px]">Débit</TableHead>
                        <TableHead className="text-right w-[120px]">Crédit</TableHead>
                        <TableHead className="text-right w-[120px]">Solde</TableHead>
                        <TableHead className="w-[50px]">Let.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compteDetail.mouvements.map((mvt) => (
                        <TableRow key={mvt.id}>
                          <TableCell className="font-mono text-sm">
                            {new Date(mvt.date_piece).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {mvt.journal_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-violet-600">
                            {mvt.numero_piece}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {mvt.libelle_ligne}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {mvt.debit > 0 ? (
                              <span className="text-blue-600">{formatMontant(mvt.debit)}</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {mvt.credit > 0 ? (
                              <span className="text-emerald-600">{formatMontant(mvt.credit)}</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatMontant(mvt.solde_cumule)}
                          </TableCell>
                          <TableCell className="text-center">
                            {mvt.lettre && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                {mvt.lettre}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <BookOpen className="h-16 w-16 mb-4 opacity-30" />
            <p>Sélectionnez un compte pour voir ses mouvements</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant ligne de compte
function CompteRow({
  compte,
  isSelected,
  onClick,
}: {
  compte: GrandLivreAccount;
  isSelected: boolean;
  onClick: () => void;
}) {
  const formatMontant = (montant: number) => {
    return Math.abs(montant).toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div
      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
        isSelected
          ? "bg-emerald-100 border border-emerald-300"
          : "hover:bg-slate-50"
      }`}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-violet-600">{compte.numero_compte}</span>
          <span className="text-sm truncate">{compte.libelle_compte}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <span
          className={`text-sm font-mono ${
            compte.sens_solde === "debiteur"
              ? "text-blue-600"
              : compte.sens_solde === "crediteur"
              ? "text-emerald-600"
              : "text-slate-400"
          }`}
        >
          {formatMontant(compte.solde)}
        </span>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
    </div>
  );
}
