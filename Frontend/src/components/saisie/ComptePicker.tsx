import { useState, useEffect, useMemo } from "react";
import { Search, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { backendApi } from "@/lib/api/backend-client";
import { cn } from "@/lib/utils";

interface Compte {
  numero_compte: string;
  libelle: string;
}

interface ComptePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (compte: { numero_compte: string; libelle: string }) => void;
}

export function ComptePicker({ open, onClose, onSelect }: ComptePickerProps) {
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Charger le plan comptable
  useEffect(() => {
    if (open) {
      loadPlanComptable();
    }
  }, [open]);

  async function loadPlanComptable() {
    setLoading(true);
    try {
      // Récupérer le plan comptable groupé par classe
      const data = await backendApi.getPlanComptable();
      
      // Aplatir toutes les classes dans un seul tableau
      const allComptes: Compte[] = [];
      Object.values(data).forEach((classeComptes) => {
        allComptes.push(...classeComptes);
      });
      
      setComptes(allComptes);
    } catch (error) {
      console.error("Erreur chargement plan comptable:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filtrer les comptes par recherche
  const filteredComptes = useMemo(() => {
    if (!searchTerm.trim()) return comptes;
    
    const term = searchTerm.toLowerCase();
    return comptes.filter(
      (c) =>
        c.numero_compte.toLowerCase().includes(term) ||
        c.libelle.toLowerCase().includes(term)
    );
  }, [comptes, searchTerm]);

  // Grouper les comptes par classe
  const groupedComptes = useMemo(() => {
    const groups: Record<string, Compte[]> = {};
    
    filteredComptes.forEach((compte) => {
      const classe = compte.numero_compte.charAt(0);
      if (!groups[classe]) {
        groups[classe] = [];
      }
      groups[classe].push(compte);
    });
    
    return groups;
  }, [filteredComptes]);

  const classeLabels: Record<string, string> = {
    "1": "Classe 1 - Comptes de capitaux",
    "2": "Classe 2 - Comptes d'immobilisations",
    "3": "Classe 3 - Comptes de stocks",
    "4": "Classe 4 - Comptes de tiers",
    "5": "Classe 5 - Comptes de trésorerie",
    "6": "Classe 6 - Comptes de charges",
    "7": "Classe 7 - Comptes de produits",
    "8": "Classe 8 - Comptes spéciaux",
  };

  function handleSelect(compte: Compte) {
    onSelect(compte);
    setSearchTerm("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Plan comptable
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un compte comptable dans la liste ci-dessous
          </DialogDescription>
        </DialogHeader>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par numéro ou libellé..."
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Liste des comptes */}
        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              Chargement du plan comptable...
            </div>
          ) : filteredComptes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {searchTerm
                ? "Aucun compte trouvé"
                : "Aucun compte disponible"}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedComptes)
                .sort()
                .map((classe) => (
                  <div key={classe}>
                    <div className="sticky top-0 bg-white z-10 pb-2">
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {classe}
                        </Badge>
                        {classeLabels[classe]}
                      </h3>
                    </div>
                    <div className="space-y-1 mt-2">
                      {groupedComptes[classe].map((compte) => (
                        <button
                          key={compte.numero_compte}
                          onClick={() => handleSelect(compte)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md",
                            "hover:bg-slate-100 transition-colors",
                            "flex items-center gap-3"
                          )}
                        >
                          <code className="font-mono text-sm font-semibold text-slate-700 min-w-[80px]">
                            {compte.numero_compte}
                          </code>
                          <span className="text-sm text-slate-600 flex-1">
                            {compte.libelle}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-slate-500 border-t pt-3">
          <span>{filteredComptes.length} compte(s) disponible(s)</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
