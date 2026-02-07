import { useEffect, useMemo, useState } from "react";
import { Save, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { backendApi, clearTestInvoices, type CompanyInfo } from "@/lib/api/backend-client";

export function CompanySettingsView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<CompanyInfo>({});

  useEffect(() => {
    const load = async () => {
      try {
        const data = await backendApi.getCompanyInfo();
        if (data) {
          setCompany(data);
        }
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les paramètres entreprise",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const hasName = useMemo(() => Boolean(company.raison_sociale && company.raison_sociale.trim()), [company.raison_sociale]);

  const handleChange = (key: keyof CompanyInfo, value: string) => {
    setCompany((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!company.raison_sociale || !company.raison_sociale.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez renseigner la raison sociale de l'entreprise.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await backendApi.updateCompanyInfo({
        raison_sociale: company.raison_sociale,
        forme_juridique: company.forme_juridique || null,
        capital_social: company.capital_social ?? null,
        devise: company.devise || null,
        rccm: company.rccm || null,
        ncc: company.ncc || null,
        adresse: company.adresse || null,
        ville: company.ville || null,
        pays: company.pays || null,
        telephone: company.telephone || null,
        email: company.email || null,
        site_web: company.site_web || null,
        secteur_activite: company.secteur_activite || null,
        logo_url: company.logo_url || null,
        date_creation: company.date_creation || null,
        exercice_debut: company.exercice_debut ?? null,
      });

      setCompany(updated);
      toast({
        title: "Enregistré",
        description: "Les paramètres entreprise sont à jour. L'IA utilisera ces données.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de sauvegarder",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearTests = async () => {
    if (!confirm("Voulez-vous vider toutes les factures et écritures de test ?")) {
      return;
    }

    console.log("[Settings] Nettoyage des tests demandé");
    try {
      const ok = await clearTestInvoices();
      if (!ok) {
        throw new Error("Nettoyage non confirmé par l'API");
      }
      toast({
        title: "Nettoyage effectué",
        description: "Toutes les factures et écritures de test ont été supprimées.",
      });
    } catch (error) {
      console.error("[Settings] Erreur nettoyage:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de nettoyer les tests",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-100">
          <Building2 className="h-6 w-6 text-violet-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Paramètres entreprise</h2>
          <p className="text-sm text-slate-500">
            Ces informations déterminent si une facture est une vente ou un achat.
          </p>
        </div>
      </div>

      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-base">Identification</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Raison sociale *</Label>
            <Input
              value={company.raison_sociale || ""}
              onChange={(e) => handleChange("raison_sociale", e.target.value)}
              placeholder="Nom complet de l'entreprise"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Forme juridique</Label>
            <Input
              value={company.forme_juridique || ""}
              onChange={(e) => handleChange("forme_juridique", e.target.value)}
              placeholder="SARL, SA, ..."
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>RCCM</Label>
            <Input
              value={company.rccm || ""}
              onChange={(e) => handleChange("rccm", e.target.value)}
              placeholder="RCCM"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>NCC / NIF</Label>
            <Input
              value={company.ncc || ""}
              onChange={(e) => handleChange("ncc", e.target.value)}
              placeholder="NCC / NIF"
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-base">Coordonnées</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input
              value={company.adresse || ""}
              onChange={(e) => handleChange("adresse", e.target.value)}
              placeholder="Adresse"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Ville</Label>
            <Input
              value={company.ville || ""}
              onChange={(e) => handleChange("ville", e.target.value)}
              placeholder="Ville"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Pays</Label>
            <Input
              value={company.pays || ""}
              onChange={(e) => handleChange("pays", e.target.value)}
              placeholder="Pays"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input
              value={company.telephone || ""}
              onChange={(e) => handleChange("telephone", e.target.value)}
              placeholder="Téléphone"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={company.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Email"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Site web</Label>
            <Input
              value={company.site_web || ""}
              onChange={(e) => handleChange("site_web", e.target.value)}
              placeholder="https://..."
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-base">Paramètres comptables</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Devise</Label>
            <Input
              value={company.devise || ""}
              onChange={(e) => handleChange("devise", e.target.value)}
              placeholder="XOF"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Exercice début (mois)</Label>
            <Input
              type="number"
              value={company.exercice_debut ?? ""}
              onChange={(e) => setCompany((prev) => ({ ...prev, exercice_debut: e.target.value ? Number(e.target.value) : null }))}
              placeholder="1"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Capital social</Label>
            <Input
              type="number"
              value={company.capital_social ?? ""}
              onChange={(e) => setCompany((prev) => ({ ...prev, capital_social: e.target.value ? Number(e.target.value) : null }))}
              placeholder="0"
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || loading || !hasName}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button variant="outline" onClick={handleClearTests}>
          Vider les tests
        </Button>
      </div>
    </div>
  );
}