/**
 * AIModelSelectorDialog - Modal de sélection du modèle IA
 * 
 * Modal compact pour choisir le modèle IA comptable
 * directement depuis l'écran d'écriture comptable.
 */

import { useState, useEffect } from "react";
import { Brain, Zap, Star, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type AIModel = "google/gemini-2.5-flash" | "google/gemini-3-flash-preview";

const AI_MODELS: Array<{
  id: AIModel;
  name: string;
  description: string;
  stats: {
    vitesse: string;
    precision: string;
    cout: string;
  };
  recommended?: boolean;
  badge?: string;
}> = [
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Équilibré - Rapide et précis (recommandé)",
    stats: {
      vitesse: "★★★★★",
      precision: "★★★★☆",
      cout: "$2.50/M",
    },
    recommended: true,
    badge: "Par défaut",
  },
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    description: "Intelligent - Précision maximale",
    stats: {
      vitesse: "★★★★☆",
      precision: "★★★★★",
      cout: "$3.00/M",
    },
    badge: "Le plus intelligent",
  },
];

// Clé localStorage pour le modèle IA (partagée avec settings/AIModelSelector)
const AI_MODEL_STORAGE_KEY = "exia-ai-model";

interface AIModelSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModelSelected?: (model: AIModel) => void;
}

export function AIModelSelectorDialog({ 
  open, 
  onOpenChange,
  onModelSelected,
}: AIModelSelectorDialogProps) {
  const [selectedModel, setSelectedModel] = useState<AIModel>(() => {
    const stored = localStorage.getItem(AI_MODEL_STORAGE_KEY);
    return (stored as AIModel) || "google/gemini-2.5-flash";
  });

  const [initialModel] = useState<AIModel>(() => {
    const stored = localStorage.getItem(AI_MODEL_STORAGE_KEY);
    return (stored as AIModel) || "google/gemini-2.5-flash";
  });

  const handleConfirm = () => {
    localStorage.setItem(AI_MODEL_STORAGE_KEY, selectedModel);
    onModelSelected?.(selectedModel);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedModel(initialModel); // Reset to initial
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-5 w-5 text-primary" />
            Modèle IA Comptable
          </DialogTitle>
          <DialogDescription>
            Choisissez le modèle d'intelligence artificielle pour générer vos écritures comptables
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selectedModel} onValueChange={(value) => setSelectedModel(value as AIModel)}>
          <div className="grid gap-3 py-4">
            {AI_MODELS.map((model) => (
              <div key={model.id} className="relative">
                <Label
                  htmlFor={model.id}
                  className={`flex cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    selectedModel === model.id
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <div className="flex w-full items-start gap-3">
                    <RadioGroupItem value={model.id} id={model.id} className="mt-1" />
                    
                    <div className="flex-1 space-y-2">
                      {/* En-tête */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base">{model.name}</h3>
                          {model.badge && (
                            <Badge variant={model.recommended ? "default" : "secondary"} className="text-xs">
                              {model.recommended && <Star className="mr-1 h-3 w-3" />}
                              {model.badge}
                            </Badge>
                          )}
                        </div>
                        {selectedModel === model.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground">{model.description}</p>

                      {/* Statistiques */}
                      <div className="grid grid-cols-3 gap-3 rounded-md bg-muted/50 p-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Zap className="h-3 w-3" />
                            Vitesse
                          </div>
                          <div className="text-sm font-medium">{model.stats.vitesse}</div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Brain className="h-3 w-3" />
                            Précision
                          </div>
                          <div className="text-sm font-medium">{model.stats.precision}</div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs text-muted-foreground">Coût</div>
                          <div className="text-sm font-medium">{model.stats.cout}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        {/* Info footer */}
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-blue-900 dark:text-blue-100">
          <p className="flex items-start gap-2">
            <Brain className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Conseil :</strong> Gemini 2.5 Flash est recommandé pour un usage quotidien. 
              Passez à Gemini 3 Flash si vous rencontrez des erreurs de classification.
            </span>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button onClick={handleConfirm}>
            <Check className="mr-2 h-4 w-4" />
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook pour récupérer le modèle sélectionné
export function useAIModel(): AIModel {
  const [model, setModel] = useState<AIModel>(() => {
    const stored = localStorage.getItem(AI_MODEL_STORAGE_KEY);
    return (stored as AIModel) || "google/gemini-2.5-flash";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(AI_MODEL_STORAGE_KEY);
      if (stored) {
        setModel(stored as AIModel);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Écouter les changements internes aussi
    const interval = setInterval(() => {
      const stored = localStorage.getItem(AI_MODEL_STORAGE_KEY);
      if (stored && stored !== model) {
        setModel(stored as AIModel);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [model]);

  return model;
}

// Fonction utilitaire pour obtenir le nom court du modèle
export function getModelDisplayName(model: AIModel): string {
  return model === "google/gemini-2.5-flash" ? "Gemini 2.5 Flash" : "Gemini 3 Flash";
}
