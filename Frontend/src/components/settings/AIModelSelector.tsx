/**
 * AIModelSelector - Composant de sélection du modèle IA
 * 
 * Permet de choisir entre Gemini 2.5 Flash et Gemini 3 Flash
 * pour la génération des écritures comptables.
 */

import { useState, useEffect } from "react";
import { Brain, Zap, Star, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type AIModel = "google/gemini-2.5-flash" | "google/gemini-3-flash-preview";

const AI_MODELS: Array<{
  id: AIModel;
  name: string;
  description: string;
  features: string[];
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
    description: "Modèle équilibré - Rapide et précis",
    features: [
      "Latence ultra-faible (0.5s)",
      "Excellent en Finance (#3 mondial)",
      "Idéal pour usage quotidien",
      "Coût raisonnable",
    ],
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
    description: "Modèle intelligent - Précision maximale",
    features: [
      "#1 mondial en Finance",
      "Reasoning niveau Pro",
      "Traite cas complexes SYSCOHADA",
      "Plus récent (Déc 2025)",
    ],
    stats: {
      vitesse: "★★★★☆",
      precision: "★★★★★",
      cout: "$3.00/M",
    },
    badge: "Le plus intelligent",
  },
];

const STORAGE_KEY = "exia-ai-model";

export function AIModelSelector() {
  const [selectedModel, setSelectedModel] = useState<AIModel>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as AIModel) || "google/gemini-2.5-flash";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  const handleModelChange = (value: string) => {
    setSelectedModel(value as AIModel);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Modèle IA Comptable</CardTitle>
          </div>
        </div>
        <CardDescription>
          Choisissez le modèle d'intelligence artificielle pour générer vos écritures comptables
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <RadioGroup value={selectedModel} onValueChange={handleModelChange}>
          <div className="grid gap-4">
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
                  <div className="flex w-full items-start gap-4">
                    <RadioGroupItem value={model.id} id={model.id} className="mt-1" />
                    
                    <div className="flex-1 space-y-3">
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

                      {/* Fonctionnalités */}
                      <div className="grid gap-1.5">
                        {model.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="text-muted-foreground">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Statistiques */}
                      <div className="grid grid-cols-3 gap-4 rounded-md bg-muted/50 p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Zap className="h-3 w-3" />
                            Vitesse
                          </div>
                          <div className="text-sm font-medium">{model.stats.vitesse}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Brain className="h-3 w-3" />
                            Précision
                          </div>
                          <div className="text-sm font-medium">{model.stats.precision}</div>
                        </div>
                        <div className="space-y-1">
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
              Passez à Gemini 3 Flash si vous rencontrez des erreurs de classification sur des cas complexes.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook pour récupérer le modèle sélectionné
export function useAIModel(): AIModel {
  const [model, setModel] = useState<AIModel>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as AIModel) || "google/gemini-2.5-flash";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setModel(stored as AIModel);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Écouter les changements internes aussi
    const interval = setInterval(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
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
