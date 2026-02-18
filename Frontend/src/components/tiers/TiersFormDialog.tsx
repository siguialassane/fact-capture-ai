
import { useEffect, useState } from "react";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  CreditCard, 
  FileText, 
  User, 
  Check, 
  X,
  Briefcase
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Re-use types from parent or define here if not exported
interface Tiers {
  id: string;
  code: string;
  type_tiers: string;
  raison_sociale: string;
  nom_commercial?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  telephone?: string;
  email?: string;
  rccm?: string;
  ncc?: string;
  compte_comptable?: string;
  conditions_paiement?: string;
  delai_paiement_jours?: number;
  plafond_credit?: number;
  devise?: string;
  contact_nom?: string;
  contact_telephone?: string;
  contact_email?: string;
  notes?: string;
  est_actif: boolean;
  created_at: string;
  updated_at: string;
}

const TYPES_TIERS = [
  { value: "client", label: "Client" },
  { value: "fournisseur", label: "Fournisseur" },
  { value: "salarie", label: "Salarié" },
  { value: "banque", label: "Banque" },
  { value: "associe", label: "Associé" },
  { value: "autre", label: "Autre" },
];

interface TiersFormDialogProps {
  open: boolean;
  onClose: () => void;
  tiers: Tiers | null;
  onSave: (body: Partial<Tiers>) => void;
  isLoading: boolean;
}

export function TiersFormDialog({
  open,
  onClose,
  tiers,
  onSave,
  isLoading,
}: TiersFormDialogProps) {
  const isEdit = !!tiers;
  const [form, setForm] = useState<Partial<Tiers>>({});
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (open) {
      if (tiers) {
        setForm({ ...tiers });
      } else {
        setForm({ 
          type_tiers: "client", 
          est_actif: true, 
          devise: "XOF",
          pays: "Côte d'Ivoire" 
        });
      }
      setActiveTab("general");
    }
  }, [open, tiers]);

  const update = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.raison_sociale) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[800px] p-0 overflow-hidden bg-slate-50/50">
        <div className="bg-white p-6 border-b">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              {isEdit ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  Modifier le tiers
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                  </div>
                  Nouveau tiers
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEdit 
                ? "Modifiez les informations du tiers ci-dessous." 
                : "Remplissez les informations pour créer un nouveau tiers."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[calc(85vh-140px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-2 bg-white border-b">
              <TabsList className="bg-transparent p-0 gap-6 h-auto">
                <TabsTrigger 
                  value="general" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:shadow-none px-0 py-2"
                >
                  Général
                </TabsTrigger>
                <TabsTrigger 
                  value="contact" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:shadow-none px-0 py-2"
                >
                  Contact & Adresse
                </TabsTrigger>
                <TabsTrigger 
                  value="financial" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:shadow-none px-0 py-2"
                >
                  Finances
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <TabsContent value="general" className="mt-0 space-y-6 animate-in fade-in-50 slide-in-from-left-2 duration-300">
                
                <div className="grid grid-cols-2 gap-6">
                  {/* Identity Section */}
                  <div className="space-y-4 col-span-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                      <Building2 className="w-4 h-4" />
                      Identité
                    </div>
                    
                    <div className="grid grid-cols-6 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="code">Code Tiers <span className="text-red-500">*</span></Label>
                        <Input
                          id="code"
                          value={form.code || ""}
                          onChange={(e) => update("code", e.target.value)}
                          placeholder="Ex: C0001"
                          className="mt-1.5"
                          disabled={isEdit}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="type">Type <span className="text-red-500">*</span></Label>
                        <Select
                          value={form.type_tiers || "client"}
                          onValueChange={(v) => update("type_tiers", v)}
                        >
                          <SelectTrigger id="type" className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TYPES_TIERS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                       <div className="col-span-2 flex flex-col justify-end pb-2">
                          <Label className="flex items-center gap-2 cursor-pointer">
                            <Switch 
                              checked={form.est_actif !== false}
                              onCheckedChange={(c) => update("est_actif", c)}
                            />
                            <span className="text-sm font-normal">Actif</span>
                          </Label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-1">
                        <Label htmlFor="raison_sociale">Raison Sociale <span className="text-red-500">*</span></Label>
                        <Input
                          id="raison_sociale"
                          value={form.raison_sociale || ""}
                          onChange={(e) => update("raison_sociale", e.target.value)}
                          placeholder="Nom de l'entreprise"
                          className="mt-1.5"
                        />
                      </div>
                      <div className="col-span-1">
                        <Label htmlFor="nom_commercial">Nom Commercial</Label>
                        <Input
                          id="nom_commercial"
                          value={form.nom_commercial || ""}
                          onChange={(e) => update("nom_commercial", e.target.value)}
                          placeholder="Marque ou enseigne"
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </div>

                   <Separator />

                  {/* Legal Section */}
                  <div className="space-y-4 col-span-2">
                     <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                      <FileText className="w-4 h-4" />
                      Mentions Légales
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ncc">N° Contribuable (NCC)</Label>
                        <Input
                          id="ncc"
                          value={form.ncc || ""}
                          onChange={(e) => update("ncc", e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rccm">RCCM</Label>
                        <Input
                          id="rccm"
                          value={form.rccm || ""}
                          onChange={(e) => update("rccm", e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="mt-0 space-y-6 animate-in fade-in-50 slide-in-from-right-2 duration-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                    <MapPin className="w-4 h-4" />
                    Adresse & Localisation
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="adresse">Adresse Postale</Label>
                      <Input
                        id="adresse"
                        value={form.adresse || ""}
                        onChange={(e) => update("adresse", e.target.value)}
                        placeholder="Rue, BP..."
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                       <Label htmlFor="ville">Ville</Label>
                       <Input
                          id="ville"
                          value={form.ville || ""}
                          onChange={(e) => update("ville", e.target.value)}
                          className="mt-1.5"
                        />
                    </div>
                    <div>
                       <Label htmlFor="pays">Pays</Label>
                       <Input
                          id="pays"
                          value={form.pays || "Côte d'Ivoire"}
                          onChange={(e) => update("pays", e.target.value)}
                          className="mt-1.5"
                        />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                    <Phone className="w-4 h-4" />
                    Coordonnées
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                       <div className="relative mt-1.5">
                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={form.email || ""}
                          onChange={(e) => update("email", e.target.value)}
                          className="pl-9"
                          placeholder="contact@exemple.com"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="telephone">Téléphone</Label>
                       <div className="relative mt-1.5">
                        <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="telephone"
                          value={form.telephone || ""}
                          onChange={(e) => update("telephone", e.target.value)}
                          className="pl-9"
                          placeholder="+225 ..."
                        />
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="contact_nom">Nom du contact principal</Label>
                      <Input
                        id="contact_nom"
                        value={form.contact_nom || ""}
                        onChange={(e) => update("contact_nom", e.target.value)}
                        placeholder="M. Jean Dupont"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="mt-0 space-y-6 animate-in fade-in-50 slide-in-from-right-2 duration-300">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                    <CreditCard className="w-4 h-4" />
                    Comptabilité
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <Label htmlFor="compte_comptable">Compte Comptable</Label>
                      <Input
                        id="compte_comptable"
                        value={form.compte_comptable || ""}
                        onChange={(e) => update("compte_comptable", e.target.value)}
                        placeholder="411000"
                        className="mt-1.5 font-mono"
                      />
                      <p className="text-xs text-slate-400 mt-1">Laisser vide pour utiliser le compte par défaut</p>
                    </div>
                    <div>
                      <Label htmlFor="devise">Devise</Label>
                       <Select
                          value={form.devise || "XOF"}
                          onValueChange={(v) => update("devise", v)}
                        >
                          <SelectTrigger id="devise" className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                            <SelectItem value="EUR">EUR (Euro)</SelectItem>
                            <SelectItem value="USD">USD (Dollar US)</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                    <FileText className="w-4 h-4" />
                    Conditions de règlement
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <Label htmlFor="conditions">Mode de règlement</Label>
                       <Input
                        id="conditions"
                        value={form.conditions_paiement || ""}
                        onChange={(e) => update("conditions_paiement", e.target.value)}
                        placeholder="Virement, Chèque..."
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                       <Label htmlFor="delai">Délai (jours)</Label>
                        <Input
                          id="delai"
                          type="number"
                          value={form.delai_paiement_jours || ""}
                          onChange={(e) => update("delai_paiement_jours", parseInt(e.target.value) || 0)}
                          className="mt-1.5"
                        />
                    </div>
                    <div>
                        <Label htmlFor="plafond">Plafond de crédit</Label>
                        <Input
                          id="plafond"
                          type="number"
                          value={form.plafond_credit || ""}
                          onChange={(e) => update("plafond_credit", parseInt(e.target.value) || 0)}
                          className="mt-1.5"
                        />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              Annuler
            </Button>
            <div className="flex gap-2">
               <Button
                type="submit"
                disabled={isLoading || !form.code || !form.raison_sociale}
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white/100 rounded-full animate-spin" />
                    Enregistrement...
                  </span>
                ) : (
                  <>
                  {isEdit ? "Mettre à jour" : "Créer le tiers"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
