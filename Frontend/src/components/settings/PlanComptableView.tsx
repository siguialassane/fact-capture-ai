import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Save, X, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Compte {
  numero_compte: string;
  libelle: string;
  classe: number;
  type_compte: string | null;
  sens_normal: "debit" | "credit";
  est_utilisable?: boolean;
}

const CLASSES_SYSCOHADA = [
  { value: 1, label: "Classe 1 - Comptes de capitaux" },
  { value: 2, label: "Classe 2 - Comptes d'immobilisations" },
  { value: 3, label: "Classe 3 - Comptes de stocks" },
  { value: 4, label: "Classe 4 - Comptes de tiers" },
  { value: 5, label: "Classe 5 - Comptes de trésorerie" },
  { value: 6, label: "Classe 6 - Comptes de charges" },
  { value: 7, label: "Classe 7 - Comptes de produits" },
  { value: 8, label: "Classe 8 - Comptes de résultats" },
];

export function PlanComptableView() {
  const { toast } = useToast();
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCompte, setCurrentCompte] = useState<Compte>({
    numero_compte: "",
    libelle: "",
    classe: 6,
    type_compte: "",
    sens_normal: "debit",
    est_utilisable: true,
  });
  const [filterClasse, setFilterClasse] = useState<number | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadComptes();
  }, []);

  const loadComptes = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/accounting/plan-comptable/all");
      const result = await response.json();
      
      if (result.success) {
        setComptes(result.data);
      } else {
        throw new Error(result.error?.message || "Erreur de chargement");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le plan comptable",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setCurrentCompte({
      numero_compte: "",
      libelle: "",
      classe: 6,
      type_compte: "",
      sens_normal: "debit",
      est_utilisable: true,
    });
    setEditMode(false);
    setDialogOpen(true);
  };

  const handleEdit = (compte: Compte) => {
    setCurrentCompte({ ...compte });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentCompte.numero_compte || !currentCompte.libelle) {
      toast({
        title: "Champs requis",
        description: "Numéro et libellé sont obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editMode
        ? `http://localhost:3001/api/accounting/plan-comptable/${currentCompte.numero_compte}`
        : "http://localhost:3001/api/accounting/plan-comptable";
      
      const method = editMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentCompte),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: editMode ? "Modifié" : "Créé",
          description: `Compte ${currentCompte.numero_compte} ${editMode ? "mis à jour" : "créé"} avec succès`,
        });
        setDialogOpen(false);
        loadComptes();
      } else {
        throw new Error(result.error?.message || "Erreur");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de sauvegarder",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (numero: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer le compte ${numero} ?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/accounting/plan-comptable/${numero}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Supprimé",
          description: `Compte ${numero} supprimé`,
        });
        loadComptes();
      } else {
        throw new Error(result.error?.message || "Erreur");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer",
        variant: "destructive",
      });
    }
  };

  const filteredComptes = comptes.filter((c) => {
    const matchClasse = filterClasse === "all" || c.classe === filterClasse;
    const matchSearch = 
      searchTerm === "" ||
      c.numero_compte.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.libelle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchClasse && matchSearch;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            <div>
              <CardTitle>Plan Comptable SYSCOHADA</CardTitle>
              <CardDescription>Gestion des comptes de l'entreprise</CardDescription>
            </div>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau compte
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <Input
            placeholder="Rechercher un compte..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterClasse.toString()} onValueChange={(v) => setFilterClasse(v === "all" ? "all" : Number(v))}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filtrer par classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {CLASSES_SYSCOHADA.map((c) => (
                <SelectItem key={c.value} value={c.value.toString()}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : (
          <ScrollArea className="h-[500px] rounded-md border">
            <div className="p-4">
              <table className="w-full">
                <thead className="border-b sticky top-0 bg-background">
                  <tr>
                    <th className="text-left p-2 font-semibold">Numéro</th>
                    <th className="text-left p-2 font-semibold">Libellé</th>
                    <th className="text-left p-2 font-semibold">Classe</th>
                    <th className="text-left p-2 font-semibold">Sens normal</th>
                    <th className="text-right p-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComptes.map((compte) => (
                    <tr key={compte.numero_compte} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono">{compte.numero_compte}</td>
                      <td className="p-2">{compte.libelle}</td>
                      <td className="p-2">
                        <Badge variant="outline">Classe {compte.classe}</Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant={compte.sens_normal === "debit" ? "default" : "secondary"}>
                          {compte.sens_normal === "debit" ? "Débit" : "Crédit"}
                        </Badge>
                      </td>
                      <td className="p-2 text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(compte)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(compte.numero_compte)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredComptes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun compte trouvé
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? "Modifier" : "Créer"} un compte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="numero">Numéro de compte *</Label>
              <Input
                id="numero"
                value={currentCompte.numero_compte}
                onChange={(e) => setCurrentCompte({ ...currentCompte, numero_compte: e.target.value })}
                disabled={editMode}
                placeholder="Ex: 6011"
              />
            </div>
            <div>
              <Label htmlFor="libelle">Libellé *</Label>
              <Input
                id="libelle"
                value={currentCompte.libelle}
                onChange={(e) => setCurrentCompte({ ...currentCompte, libelle: e.target.value })}
                placeholder="Ex: Achats de marchandises"
              />
            </div>
            <div>
              <Label htmlFor="classe">Classe *</Label>
              <Select
                value={currentCompte.classe.toString()}
                onValueChange={(v) => setCurrentCompte({ ...currentCompte, classe: Number(v) })}
              >
                <SelectTrigger id="classe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES_SYSCOHADA.map((c) => (
                    <SelectItem key={c.value} value={c.value.toString()}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Type de compte</Label>
              <Input
                id="type"
                value={currentCompte.type_compte || ""}
                onChange={(e) => setCurrentCompte({ ...currentCompte, type_compte: e.target.value })}
                placeholder="détail, collectif..."
              />
            </div>
            <div>
              <Label htmlFor="sens">Sens normal *</Label>
              <Select
                value={currentCompte.sens_normal}
                onValueChange={(v: "debit" | "credit") => setCurrentCompte({ ...currentCompte, sens_normal: v })}
              >
                <SelectTrigger id="sens">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Débit</SelectItem>
                  <SelectItem value="credit">Crédit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              {editMode ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
