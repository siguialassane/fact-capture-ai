/**
 * Panneau d'Audit Comptable
 * 
 * Affiche les résultats de l'audit Gemini avec détail des anomalies
 */

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  auditEtatsFinanciers,
  type AuditResult,
  type AuditAnomalie,
} from "@/lib/audit-api";

interface AuditPanelProps {
  exercice: string;
}

export function AuditPanel({ exercice }: AuditPanelProps) {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAnomalies, setExpandedAnomalies] = useState<Set<number>>(new Set());

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await auditEtatsFinanciers(exercice);
      setAuditResult(result);
      // Expand all anomalies by default
      if (result.anomalies.length > 0) {
        setExpandedAnomalies(new Set(result.anomalies.map((_, i) => i)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'audit");
    } finally {
      setLoading(false);
    }
  };

  const toggleAnomalie = (index: number) => {
    setExpandedAnomalies((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    if (status === "CONFORME") {
      return <ShieldCheck className="h-6 w-6 text-emerald-500" />;
    }
    return <ShieldAlert className="h-6 w-6 text-red-500" />;
  };

  const getNiveauBadge = (niveau: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      OK: { color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> },
      CRITIQUE: { color: "bg-red-100 text-red-700", icon: <XCircle className="h-3 w-3" /> },
      MAJEURE: { color: "bg-orange-100 text-orange-700", icon: <AlertTriangle className="h-3 w-3" /> },
      MINEURE: { color: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
      OBSERVATION: { color: "bg-blue-100 text-blue-700", icon: <Info className="h-3 w-3" /> },
    };
    const { color, icon } = config[niveau] || config.OBSERVATION;
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {niveau}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      Classification: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      Calcul: <AlertCircle className="h-4 w-4 text-red-500" />,
      Équilibre: <XCircle className="h-4 w-4 text-red-600" />,
      Cohérence: <AlertCircle className="h-4 w-4 text-yellow-500" />,
      Doublon: <Info className="h-4 w-4 text-blue-500" />,
    };
    return icons[type] || <Info className="h-4 w-4" />;
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <span>Audit IA - Expert Comptable</span>
          </div>
          <Button
            onClick={runAudit}
            disabled={loading}
            variant={auditResult ? "outline" : "default"}
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : auditResult ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Relancer l'audit
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Lancer l'audit Gemini
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Erreur lors de l'audit</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!auditResult && !loading && !error && (
          <div className="text-center py-8 text-slate-400">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Cliquez sur "Lancer l'audit" pour analyser les états financiers</p>
            <p className="text-sm mt-2">
              Gemini analysera les données pour détecter les anomalies SYSCOHADA
            </p>
          </div>
        )}

        {auditResult && (
          <div className="space-y-4">
            {/* Résumé */}
            <div
              className={`p-4 rounded-lg border ${auditResult.status === "CONFORME"
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
                }`}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(auditResult.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-lg">
                      {auditResult.status === "CONFORME"
                        ? "États financiers conformes"
                        : "Anomalies détectées"}
                    </span>
                    {getNiveauBadge(auditResult.niveau)}
                  </div>
                  <p className="text-sm text-slate-600">{auditResult.resume_audit}</p>
                  {auditResult.duree_ms && (
                    <p className="text-xs text-slate-400 mt-2">
                      Audit réalisé en {(auditResult.duree_ms / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Anomalies */}
            {auditResult.anomalies.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Anomalies détectées ({auditResult.anomalies.length})
                </h4>

                {auditResult.anomalies.map((anomalie, index) => (
                  <Collapsible
                    key={index}
                    open={expandedAnomalies.has(index)}
                    onOpenChange={() => toggleAnomalie(index)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                        {getTypeIcon(anomalie.type)}
                        <span className="flex-1 text-left font-medium text-sm">
                          {anomalie.type}: {anomalie.description.substring(0, 60)}
                          {anomalie.description.length > 60 ? "..." : ""}
                        </span>
                        {anomalie.compte && (
                          <Badge variant="outline" className="font-mono">
                            {anomalie.compte}
                          </Badge>
                        )}
                        {expandedAnomalies.has(index) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="ml-7 mt-2 p-4 bg-white border rounded-lg space-y-3">
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase">
                            Description
                          </span>
                          <p className="text-sm text-slate-700">{anomalie.description}</p>
                        </div>

                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase">
                            Impact
                          </span>
                          <p className="text-sm text-red-600">{anomalie.impact}</p>
                        </div>

                        {(anomalie.montant_errone != null ||
                          anomalie.montant_attendu != null) && (
                            <div className="flex gap-4">
                              {anomalie.montant_errone != null && (
                                <div>
                                  <span className="text-xs font-semibold text-slate-500 uppercase">
                                    Montant erroné
                                  </span>
                                  <p className="text-sm font-mono text-red-600">
                                    {anomalie.montant_errone.toLocaleString()} FCFA
                                  </p>
                                </div>
                              )}
                              {anomalie.montant_attendu != null && (
                                <div>
                                  <span className="text-xs font-semibold text-slate-500 uppercase">
                                    Montant attendu
                                  </span>
                                  <p className="text-sm font-mono text-emerald-600">
                                    {anomalie.montant_attendu.toLocaleString()} FCFA
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase">
                            Correction proposée
                          </span>
                          <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                            {anomalie.correction_proposee}
                          </p>
                        </div>

                        {anomalie.reference_syscohada && (
                          <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase">
                              Référence SYSCOHADA
                            </span>
                            <p className="text-xs text-slate-500 italic">
                              {anomalie.reference_syscohada}
                            </p>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}

            {/* Détails de vérification avec preuves */}
            {(auditResult as any).details_verification && (auditResult as any).details_verification.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Détails des Contrôles Effectués
                </h4>
                <div className="space-y-2">
                  {(auditResult as any).details_verification.map((item: any, i: number) => (
                    <div key={i} className={`p-3 rounded-lg border ${item.resultat === "CONFORME"
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-red-50/50 border-red-200"
                      }`}>
                      <div className="flex items-start gap-2">
                        {item.resultat === "CONFORME" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 space-y-1">
                          <div className="font-medium text-sm text-slate-800">{item.controle}</div>
                          <div className="text-sm text-slate-600">{item.details}</div>
                          {item.preuves && (
                            <div className="text-xs font-mono bg-white/70 p-2 rounded border border-slate-200 text-slate-700">
                              📊 {item.preuves}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Synthèse chiffrée */}
            {(auditResult as any).synthese_chiffree && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Synthèse Chiffrée
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries((auditResult as any).synthese_chiffree).map(([key, value]) => (
                    <div key={key} className="p-2 bg-slate-50 rounded border">
                      <div className="text-xs text-slate-500 uppercase">{key.replace(/_/g, ' ')}</div>
                      <div className="text-sm font-semibold text-slate-800">{String(value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Points de vérification (ancien format - rétro-compatibilité) */}
            {auditResult.points_verification && auditResult.points_verification.length > 0 && !(auditResult as any).details_verification && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Points vérifiés
                </h4>
                <ul className="space-y-1">
                  {auditResult.points_verification.map((point, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommandations */}
            {auditResult.recommandations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Recommandations
                </h4>
                <ul className="space-y-1">
                  {auditResult.recommandations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-blue-500">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
