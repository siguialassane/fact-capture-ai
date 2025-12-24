/**
 * Vue des États Financiers
 * 
 * Affiche le Bilan, Compte de Résultat et autres états SYSCOHADA
 */

import { useState, useEffect } from "react";
import {
  FileBarChart2,
  Building2,
  TrendingUp,
  TrendingDown,
  Calculator,
  Download,
  Calendar,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  getBilan,
  getCompteResultat,
  getIndicateursFinanciers,
  type Bilan,
  type CompteResultat,
  type Indicateurs,
} from "@/lib/etats-financiers-api";
import { AuditPanel } from "./AuditPanel";

export function EtatsFinanciersView() {
  const [activeTab, setActiveTab] = useState<"bilan" | "resultat" | "indicateurs">("bilan");
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [compteResultat, setCompteResultat] = useState<CompteResultat | null>(null);
  const [indicateurs, setIndicateurs] = useState<Indicateurs | null>(null);
  const [loading, setLoading] = useState(true);
  const [exercice, setExercice] = useState<string>(() => {
    return new Date().getFullYear().toString();
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["actif-immobilise", "actif-circulant", "capitaux", "dettes", "charges", "produits"])
  );

  // Charger les données
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [bilanData, resultatData, indicateursData] = await Promise.all([
          getBilan(exercice),
          getCompteResultat(exercice),
          getIndicateursFinanciers(exercice),
        ]);
        setBilan(bilanData);
        setCompteResultat(resultatData);
        setIndicateurs(indicateursData);
      } catch (error) {
        console.error("Erreur chargement états financiers:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [exercice]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const formatMontant = (montant: number) => {
    return montant.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100">
            <FileBarChart2 className="h-6 w-6 text-indigo-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">États Financiers</h2>
            <p className="text-sm text-slate-500">SYSCOHADA - Bilan, Compte de Résultat, Indicateurs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={exercice} onValueChange={setExercice}>
            <SelectTrigger className="w-[130px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Exercice" />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2].map((i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bilan" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Bilan
          </TabsTrigger>
          <TabsTrigger value="resultat" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Compte de Résultat
          </TabsTrigger>
          <TabsTrigger value="indicateurs" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Indicateurs
          </TabsTrigger>
        </TabsList>

        {/* BILAN */}
        <TabsContent value="bilan" className="mt-4">
          {bilan ? (
            <div className="grid grid-cols-2 gap-6">
              {/* ACTIF */}
              <Card>
                <CardHeader className="pb-3 bg-blue-50">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-blue-700">ACTIF</span>
                    <Badge variant="outline" className="text-lg font-mono">
                      {formatMontant(bilan.total_actif)} FCFA
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Actif Immobilisé */}
                  <Collapsible
                    open={expandedSections.has("actif-immobilise")}
                    onOpenChange={() => toggleSection("actif-immobilise")}
                  >
                    <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100">
                      <span className="font-semibold text-slate-700">Actif Immobilisé</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {formatMontant(bilan.actif_immobilise.total)}
                        </span>
                        {expandedSections.has("actif-immobilise") ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Table>
                        <TableBody>
                          {bilan.actif_immobilise.lignes.map((ligne, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">{ligne.libelle}</TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {formatMontant(ligne.montant)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Actif Circulant */}
                  <Collapsible
                    open={expandedSections.has("actif-circulant")}
                    onOpenChange={() => toggleSection("actif-circulant")}
                  >
                    <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 border-t">
                      <span className="font-semibold text-slate-700">Actif Circulant</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {formatMontant(bilan.actif_circulant.total)}
                        </span>
                        {expandedSections.has("actif-circulant") ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Table>
                        <TableBody>
                          {bilan.actif_circulant.lignes.map((ligne, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">{ligne.libelle}</TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {formatMontant(ligne.montant)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Trésorerie Actif */}
                  <div className="px-4 py-3 flex items-center justify-between border-t bg-blue-50">
                    <span className="font-semibold text-blue-700">Trésorerie Actif</span>
                    <span className="font-mono font-semibold text-blue-700">
                      {formatMontant(bilan.tresorerie_actif)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* PASSIF */}
              <Card>
                <CardHeader className="pb-3 bg-emerald-50">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-emerald-700">PASSIF</span>
                    <Badge variant="outline" className="text-lg font-mono">
                      {formatMontant(bilan.total_passif)} FCFA
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Capitaux Propres */}
                  <Collapsible
                    open={expandedSections.has("capitaux")}
                    onOpenChange={() => toggleSection("capitaux")}
                  >
                    <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100">
                      <span className="font-semibold text-slate-700">Capitaux Propres</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {formatMontant(bilan.capitaux_propres.total)}
                        </span>
                        {expandedSections.has("capitaux") ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Table>
                        <TableBody>
                          {bilan.capitaux_propres.lignes.map((ligne, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">{ligne.libelle}</TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {formatMontant(ligne.montant)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Dettes */}
                  <Collapsible
                    open={expandedSections.has("dettes")}
                    onOpenChange={() => toggleSection("dettes")}
                  >
                    <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 border-t">
                      <span className="font-semibold text-slate-700">Dettes</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {formatMontant(bilan.dettes.total)}
                        </span>
                        {expandedSections.has("dettes") ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Table>
                        <TableBody>
                          {bilan.dettes.lignes.map((ligne, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">{ligne.libelle}</TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {formatMontant(ligne.montant)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Trésorerie Passif */}
                  <div className="px-4 py-3 flex items-center justify-between border-t bg-emerald-50">
                    <span className="font-semibold text-emerald-700">Trésorerie Passif</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      {formatMontant(bilan.tresorerie_passif)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune donnée de bilan disponible pour cet exercice</p>
              <p className="text-sm mt-2">Enregistrez des écritures comptables pour générer le bilan</p>
            </div>
          )}
        </TabsContent>

        {/* COMPTE DE RÉSULTAT */}
        <TabsContent value="resultat" className="mt-4">
          {compteResultat ? (
            <div className="space-y-6">
              {/* Résumé */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-emerald-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-700 mb-2">
                      <TrendingUp className="h-5 w-5" />
                      <span className="font-medium">Total Produits</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-emerald-700">
                      {formatMontant(compteResultat.total_produits)} FCFA
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                      <TrendingDown className="h-5 w-5" />
                      <span className="font-medium">Total Charges</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-red-700">
                      {formatMontant(compteResultat.total_charges)} FCFA
                    </div>
                  </CardContent>
                </Card>

                <Card className={compteResultat.resultat_net >= 0 ? "bg-emerald-100" : "bg-red-100"}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-5 w-5" />
                      <span className="font-medium">Résultat Net</span>
                    </div>
                    <div className={`text-2xl font-bold font-mono ${
                      compteResultat.resultat_net >= 0 ? "text-emerald-700" : "text-red-700"
                    }`}>
                      {compteResultat.resultat_net >= 0 ? "+" : ""}
                      {formatMontant(compteResultat.resultat_net)} FCFA
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Détail */}
              <div className="grid grid-cols-2 gap-6">
                {/* Charges */}
                <Card>
                  <CardHeader className="pb-3 bg-red-50">
                    <CardTitle className="text-red-700">CHARGES</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Collapsible
                      open={expandedSections.has("charges")}
                      onOpenChange={() => toggleSection("charges")}
                    >
                      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100">
                        <span className="font-semibold text-slate-700">Charges d'exploitation</span>
                        <ChevronDown className="h-4 w-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Table>
                          <TableBody>
                            {compteResultat.charges.map((ligne, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-sm">{ligne.libelle}</TableCell>
                                <TableCell className="text-right font-mono text-sm text-red-600">
                                  {formatMontant(ligne.montant)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>

                {/* Produits */}
                <Card>
                  <CardHeader className="pb-3 bg-emerald-50">
                    <CardTitle className="text-emerald-700">PRODUITS</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Collapsible
                      open={expandedSections.has("produits")}
                      onOpenChange={() => toggleSection("produits")}
                    >
                      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100">
                        <span className="font-semibold text-slate-700">Produits d'exploitation</span>
                        <ChevronDown className="h-4 w-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Table>
                          <TableBody>
                            {compteResultat.produits.map((ligne, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-sm">{ligne.libelle}</TableCell>
                                <TableCell className="text-right font-mono text-sm text-emerald-600">
                                  {formatMontant(ligne.montant)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune donnée de résultat disponible pour cet exercice</p>
            </div>
          )}
        </TabsContent>

        {/* INDICATEURS */}
        <TabsContent value="indicateurs" className="mt-4">
          {indicateurs ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Ratios de rentabilité */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ratios de Rentabilité</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Marge brute</span>
                    <Badge variant={indicateurs.marge_brute >= 20 ? "default" : "secondary"}>
                      {indicateurs.marge_brute.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Marge nette</span>
                    <Badge variant={indicateurs.marge_nette >= 5 ? "default" : "secondary"}>
                      {indicateurs.marge_nette.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">ROE (Rentabilité des capitaux)</span>
                    <Badge variant={indicateurs.roe >= 10 ? "default" : "secondary"}>
                      {indicateurs.roe.toFixed(1)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Ratios de liquidité */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ratios de Liquidité</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Ratio de liquidité générale</span>
                    <Badge variant={indicateurs.ratio_liquidite >= 1 ? "default" : "destructive"}>
                      {indicateurs.ratio_liquidite.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">BFR (Besoin en Fonds de Roulement)</span>
                    <span className="font-mono text-sm">
                      {formatMontant(indicateurs.bfr)} FCFA
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Trésorerie nette</span>
                    <span className={`font-mono text-sm ${
                      indicateurs.tresorerie_nette >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {formatMontant(indicateurs.tresorerie_nette)} FCFA
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Ratios de structure */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ratios de Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Taux d'endettement</span>
                    <Badge variant={indicateurs.taux_endettement <= 100 ? "default" : "destructive"}>
                      {indicateurs.taux_endettement.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Autonomie financière</span>
                    <Badge variant={indicateurs.autonomie_financiere >= 30 ? "default" : "secondary"}>
                      {indicateurs.autonomie_financiere.toFixed(1)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Délais de rotation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Délais de Rotation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Délai client (jours)</span>
                    <span className="font-mono text-sm">{indicateurs.delai_client} jours</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Délai fournisseur (jours)</span>
                    <span className="font-mono text-sm">{indicateurs.delai_fournisseur} jours</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Rotation des stocks (jours)</span>
                    <span className="font-mono text-sm">{indicateurs.rotation_stocks} jours</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Indicateurs non disponibles</p>
              <p className="text-sm mt-2">Nécessite des données comptables complètes</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Panneau d'Audit IA */}
      <AuditPanel exercice={exercice} />
    </div>
  );
}
