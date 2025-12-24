/**
 * AccountingEntryView Component
 * 
 * Affiche l'écriture comptable générée par Gemini
 * avec le raisonnement et les options de modification
 */

import { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  Calculator,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  Brain,
  Clock,
  FileText,
  Building2,
  Calendar,
  Hash,
  Send,
  Loader2,
  MessageCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { JournalEntry, AccountingStatus } from "@/lib/accounting-api";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AccountingEntryViewProps {
  entry: JournalEntry | null;
  status: AccountingStatus;
  reasoning?: {
    thinking_content: string;
    duration_ms?: number;
  };
  suggestions?: string[];
  onRefine?: (feedback: string) => void;
  onSave?: () => void;
  onChat?: (message: string, entry: JournalEntry) => Promise<string>;
  isSaving?: boolean;
  isSaved?: boolean;
}

export function AccountingEntryView({
  entry,
  status,
  reasoning,
  suggestions,
  onRefine,
  onSave,
  onChat,
  isSaving = false,
  isSaved = false,
}: AccountingEntryViewProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle chat send
  const handleSendChat = async () => {
    if (!chatInput.trim() || !entry || !onChat) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await onChat(userMessage, entry);
      setChatMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Désolé, une erreur s'est produite. Veuillez réessayer." 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // État d'attente
  if (status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-6">
          <BookOpen className="h-12 w-12 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">
          Écritures Comptables
        </h2>
        <p className="text-slate-500 max-w-md mb-6">
          Analysez une facture pour générer automatiquement l'écriture comptable
          correspondante selon le plan SYSCOHADA.
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Sparkles className="h-4 w-4" />
          <span>Propulsé par Gemini avec mode raisonnement</span>
        </div>
      </div>
    );
  }

  // État de génération
  if (status === "generating" || status === "refining") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
            <Brain className="h-12 w-12 text-violet-600 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
            <Loader2 className="h-6 w-6 text-violet-600 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {status === "generating" ? "Génération en cours..." : "Affinement en cours..."}
        </h2>
        <p className="text-slate-500 max-w-md">
          Gemini analyse la facture et construit l'écriture comptable
          en utilisant le mode raisonnement approfondi.
        </p>
      </div>
    );
  }

  // État d'erreur
  if (status === "error" || !entry) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <AlertCircle className="h-12 w-12 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Erreur de génération
        </h2>
        <p className="text-slate-500 max-w-md">
          Impossible de générer l'écriture comptable. Vérifiez les données de la facture.
        </p>
      </div>
    );
  }

  // Affichage de l'écriture
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-emerald-50 to-teal-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <Calculator className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Écriture Comptable</h2>
              <p className="text-sm text-slate-500">{entry.libelle_general}</p>
            </div>
          </div>
          <Badge 
            variant={entry.equilibre ? "default" : "destructive"}
            className={entry.equilibre ? "bg-emerald-500" : ""}
          >
            {entry.equilibre ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Équilibrée
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Déséquilibrée
              </>
            )}
          </Badge>
        </div>

        {/* Infos clés */}
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600">Date:</span>
            <span className="font-medium">{entry.date_piece}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Hash className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600">N° Pièce:</span>
            <span className="font-mono font-medium">{entry.numero_piece}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600">Journal:</span>
            <span className="font-medium">{entry.journal_code} - {entry.journal_libelle}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600">Tiers:</span>
            <span className="font-medium">{entry.tiers_nom || "Non identifié"}</span>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Tableau des lignes d'écriture */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lignes d'écriture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[120px]">Compte</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-right w-[150px]">Débit</TableHead>
                    <TableHead className="text-right w-[150px]">Crédit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.lignes.map((ligne, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono font-medium text-violet-700">
                        {ligne.numero_compte}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-700">{ligne.libelle_compte}</div>
                        <div className="text-sm text-slate-500">{ligne.libelle_ligne}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ligne.debit > 0 ? (
                          <span className="text-blue-600 font-medium">
                            {ligne.debit.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ligne.credit > 0 ? (
                          <span className="text-emerald-600 font-medium">
                            {ligne.credit.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Ligne de total */}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={2} className="text-right">
                      TOTAUX
                    </TableCell>
                    <TableCell className="text-right font-mono text-blue-700">
                      {entry.total_debit.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-700">
                      {entry.total_credit.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* BOUTONS D'ACTION - Bien visible après le tableau */}
            <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isSaved ? (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Écriture enregistrée !</span>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">
                      {entry.equilibre ? (
                        <span className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-600" />
                          Écriture équilibrée, prête à être enregistrée
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          Écriture déséquilibrée - Correction nécessaire
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => onRefine?.("")}
                    disabled={isSaving}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Régénérer
                  </Button>
                  <Button 
                    onClick={onSave} 
                    disabled={!entry.equilibre || isSaving || isSaved}
                    className={`${isSaved ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'} min-w-[200px]`}
                    size="lg"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : isSaved ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Enregistrée ✓
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        💾 Enregistrer l'écriture
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Prochaine étape après enregistrement */}
              {isSaved && (
                <div className="mt-4 pt-4 border-t border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-emerald-700">
                      <strong>Prochaine étape :</strong> Vous pouvez maintenant scanner une nouvelle facture 
                      ou consulter vos écritures dans le tableau de bord.
                    </div>
                    <Button variant="outline" className="gap-2">
                      Nouvelle facture
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CHAT AVEC GEMINI - Pour poser des questions sur l'écriture */}
        {onChat && (
          <Card className="border-blue-200">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                <MessageCircle className="h-5 w-5" />
                Discuter avec Gemini sur cette écriture
              </CardTitle>
              <p className="text-sm text-blue-600 mt-1">
                Posez des questions sur l'écriture générée, demandez des explications ou des modifications
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Messages de chat */}
              <div className="space-y-3 max-h-[250px] overflow-auto mb-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Posez une question sur l'écriture comptable</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {[
                        "Pourquoi ce compte ?",
                        "La TVA est-elle correcte ?",
                        "Explique cette écriture",
                      ].map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => setChatInput(suggestion)}
                          className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-blue-100 text-blue-900 ml-8"
                          : "bg-slate-100 text-slate-800 mr-8"
                      }`}
                    >
                      <div className="text-xs font-medium mb-1 opacity-70">
                        {msg.role === "user" ? "Vous" : "Gemini"}
                      </div>
                      {msg.role === "assistant" ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="bg-slate-100 text-slate-800 mr-8 p-3 rounded-lg">
                    <div className="text-xs font-medium mb-1 opacity-70">Gemini</div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Réflexion en cours...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input de chat */}
              <div className="flex gap-2">
                <Input
                  placeholder="Posez une question sur cette écriture..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                  disabled={isChatLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendChat} 
                  disabled={!chatInput.trim() || isChatLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Zone de correction si besoin */}
        {onRefine && !isSaved && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Demander une correction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Ex: Le compte de charge devrait être 6054 Fournitures informatiques, pas 6011..."
                value={refineFeedback}
                onChange={(e) => setRefineFeedback(e.target.value)}
                rows={3}
              />
              <Button
                onClick={() => {
                  if (refineFeedback.trim()) {
                    onRefine(refineFeedback);
                    setRefineFeedback("");
                  }
                }}
                disabled={!refineFeedback.trim()}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Demander correction
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Raisonnement Gemini (dépliable) */}
        {reasoning && (
          <Card className="border-violet-200 bg-violet-50/30">
            <CardHeader 
              className="pb-3 cursor-pointer"
              onClick={() => setShowReasoning(!showReasoning)}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-violet-700">
                  <Brain className="h-5 w-5" />
                  Raisonnement Gemini
                  {reasoning.duration_ms && (
                    <span className="text-xs font-normal text-violet-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {(reasoning.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                {showReasoning ? (
                  <ChevronUp className="h-5 w-5 text-violet-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-violet-500" />
                )}
              </CardTitle>
            </CardHeader>
            {showReasoning && (
              <CardContent>
                <div className="bg-white rounded-lg p-4 border border-violet-200 text-sm text-slate-600 whitespace-pre-wrap max-h-[300px] overflow-auto">
                  {reasoning.thinking_content}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Commentaires et suggestions */}
        {(entry.commentaires || (suggestions && suggestions.length > 0)) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Commentaires & Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {entry.commentaires && (
                <p className="text-slate-600">{entry.commentaires}</p>
              )}
              {suggestions && suggestions.length > 0 && (
                <ul className="space-y-1">
                  {suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-emerald-500">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
