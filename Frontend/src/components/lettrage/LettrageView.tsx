/**
 * Vue Lettrage
 * 
 * Rapprochement des factures et règlements
 */

import { useState, useEffect } from "react";
import {
  Link2,
  Unlink,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Filter,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  getLignesALettrer,
  getPropositionsLettrage,
  getStatistiquesLettrage,
  effectuerLettrage,
  annulerLettrage,
  lettrageAuto,
  type LigneLettrable,
  type PropositionLettrage,
  type LettrageStats,
} from "@/lib/api/backend-client";
import { useToast } from "@/hooks/use-toast";

export function LettrageView() {
  const { toast } = useToast();
  const [lignes, setLignes] = useState<LigneLettrable[]>([]);
  const [propositions, setPropositions] = useState<PropositionLettrage[]>([]);
  const [stats, setStats] = useState<LettrageStats | null>(null);
  const [selectedLignes, setSelectedLignes] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Filtres
  const [compteFilter, setCompteFilter] = useState("401");
  const [statutFilter, setStatutFilter] = useState<"non_lettre" | "lettre" | "">("");
  const [searchQuery, setSearchQuery] = useState("");

  // Charger les données
  useEffect(() => {
    loadData();
  }, [compteFilter, statutFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [lignesData, statsData] = await Promise.all([
        getLignesALettrer({
          compte_debut: compteFilter,
          compte_fin: compteFilter + "Z",
          statut: statutFilter || undefined,
        }),
        getStatistiquesLettrage(compteFilter),
      ]);
      setLignes(lignesData);
      setStats(statsData);

      // Charger les propositions pour les comptes de tiers
      if (compteFilter.startsWith("4")) {
        const propsData = await getPropositionsLettrage(compteFilter);
        setPropositions(propsData);
      } else {
        setPropositions([]);
      }
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // Filtrer les lignes par recherche
  const filteredLignes = searchQuery
    ? lignes.filter(
        (l) =>
          l.numero_piece.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.libelle_ligne.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (l.tiers_nom?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    : lignes;

  // Calculer le total sélectionné
  const totalSelected = Array.from(selectedLignes).reduce((sum, id) => {
    const ligne = lignes.find((l) => l.id === id);
    return sum + (ligne?.debit || 0) - (ligne?.credit || 0);
  }, 0);

  // Sélectionner/désélectionner une ligne
  const toggleLigne = (id: number) => {
    const newSelected = new Set(selectedLignes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLignes(newSelected);
  };

  // Effectuer le lettrage
  async function handleLettrage() {
    if (selectedLignes.size < 2) {
      toast({
        title: "Sélection insuffisante",
        description: "Sélectionnez au moins 2 lignes pour lettrer",
        variant: "destructive",
      });
      return;
    }

    if (Math.abs(totalSelected) > 0.01) {
      toast({
        title: "Écart détecté",
        description: `Les lignes sélectionnées ont un écart de ${totalSelected.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const result = await effectuerLettrage(
        Array.from(selectedLignes),
        compteFilter
      );

      if (result.success) {
        toast({
          title: "Lettrage effectué ✓",
          description: `Lettre ${result.lettre} appliquée à ${result.lignes_lettrees?.length} lignes`,
        });
        setSelectedLignes(new Set());
        await loadData();
      } else {
        toast({
          title: "Échec du lettrage",
          description: result.error || "Erreur inconnue",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer le lettrage",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  }

  // Lettrage automatique
  async function handleLettrageAuto() {
    setProcessing(true);
    try {
      const result = await lettrageAuto(compteFilter, { confianceMin: 90 });
      
      toast({
        title: "Lettrage automatique terminé",
        description: `${result.nb_lettres} lettrages effectués sur ${result.nb_propositions} propositions`,
      });
      
      await loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer le lettrage automatique",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  }

  // Appliquer une proposition
  async function applyProposition(prop: PropositionLettrage) {
    setProcessing(true);
    try {
      const ligneIds = [
        ...prop.lignes_debit.map((l) => l.id),
        ...prop.lignes_credit.map((l) => l.id),
      ];

      const result = await effectuerLettrage(ligneIds, prop.compte, prop.tiers_code);

      if (result.success) {
        toast({
          title: "Lettrage effectué ✓",
          description: `${prop.raison}`,
        });
        await loadData();
      } else {
        toast({
          title: "Échec",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'appliquer la proposition",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  }

  const formatMontant = (montant: number) => {
    return montant.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
          <div className="p-2 rounded-lg bg-amber-100">
            <Link2 className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Lettrage</h2>
            <p className="text-sm text-slate-500">Rapprochement factures et règlements</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={compteFilter} onValueChange={setCompteFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Compte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="401">401 - Fournisseurs</SelectItem>
              <SelectItem value="411">411 - Clients</SelectItem>
              <SelectItem value="421">421 - Personnel</SelectItem>
              <SelectItem value="44">44 - État et collectivités</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statutFilter || "all"} onValueChange={(v) => setStatutFilter(v === "all" ? "" : v as any)}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="non_lettre">Non lettrés</SelectItem>
              <SelectItem value="lettre">Lettrés</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={handleLettrageAuto}
            disabled={processing || propositions.length === 0}
          >
            <Zap className="h-4 w-4 mr-2" />
            Auto-lettrage
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-slate-800">{stats.nb_lignes_total}</div>
              <div className="text-sm text-slate-500">Lignes totales</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.nb_lignes_lettrees}</div>
              <div className="text-sm text-slate-500">Lettrées</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">{stats.nb_lignes_non_lettrees}</div>
              <div className="text-sm text-slate-500">À lettrer</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.taux_lettrage.toFixed(0)}%</div>
              <div className="text-sm text-slate-500">Taux de lettrage</div>
              <Progress value={stats.taux_lettrage} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Liste des lignes */}
        <div className="col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Lignes à lettrer</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Barre d'action si sélection */}
              {selectedLignes.size > 0 && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {selectedLignes.size} lignes sélectionnées
                    </span>
                    <span
                      className={`font-mono text-sm ${
                        Math.abs(totalSelected) < 0.01
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      Écart: {formatMontant(totalSelected)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLignes(new Set())}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleLettrage}
                      disabled={processing || Math.abs(totalSelected) > 0.01}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Link2 className="h-4 w-4 mr-2" />
                      )}
                      Lettrer
                    </Button>
                  </div>
                </div>
              )}

              <div className="border rounded-lg max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[90px]">Date</TableHead>
                      <TableHead className="w-[110px]">N° Pièce</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead className="text-right w-[100px]">Débit</TableHead>
                      <TableHead className="text-right w-[100px]">Crédit</TableHead>
                      <TableHead className="w-[50px]">Let.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLignes.map((ligne) => (
                      <TableRow
                        key={ligne.id}
                        className={`cursor-pointer ${
                          selectedLignes.has(ligne.id) ? "bg-amber-50" : ""
                        } ${ligne.lettre ? "opacity-60" : ""}`}
                        onClick={() => !ligne.lettre && toggleLigne(ligne.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedLignes.has(ligne.id)}
                            disabled={!!ligne.lettre}
                            onCheckedChange={() => toggleLigne(ligne.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {new Date(ligne.date_piece).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-violet-600">
                          {ligne.numero_piece}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {ligne.libelle_ligne}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {ligne.debit > 0 ? (
                            <span className="text-blue-600">{formatMontant(ligne.debit)}</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {ligne.credit > 0 ? (
                            <span className="text-emerald-600">{formatMontant(ligne.credit)}</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {ligne.lettre && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              {ligne.lettre}
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

        {/* Propositions */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Propositions IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {propositions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune proposition de lettrage</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-auto">
                  {propositions.map((prop, idx) => (
                    <div
                      key={idx}
                      className="p-3 border rounded-lg hover:border-amber-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          className={
                            prop.confiance >= 90
                              ? "bg-green-100 text-green-700"
                              : prop.confiance >= 70
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }
                        >
                          {prop.confiance}% confiance
                        </Badge>
                        <span className="font-mono text-sm font-medium">
                          {formatMontant(prop.montant_rapprochable)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{prop.raison}</p>
                      <div className="text-xs space-y-1 mb-3">
                        <div className="text-blue-600">
                          ↗ {prop.lignes_debit.map((l) => l.numero_piece).join(", ")}
                        </div>
                        <div className="text-emerald-600">
                          ↘ {prop.lignes_credit.map((l) => l.numero_piece).join(", ")}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => applyProposition(prop)}
                        disabled={processing}
                      >
                        <Link2 className="h-3 w-3 mr-2" />
                        Appliquer
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
