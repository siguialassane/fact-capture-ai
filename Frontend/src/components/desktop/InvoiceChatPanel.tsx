import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  RefreshCw,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import type { FlexibleInvoiceAIResult } from "@/lib/openrouter";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isRegenerationRequest?: boolean;
  newData?: FlexibleInvoiceAIResult;
}

interface InvoiceChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: FlexibleInvoiceAIResult | null;
  imageBase64: string | null;
  onSendMessage: (message: string) => Promise<string>;
  onRegenerateData: (newData: FlexibleInvoiceAIResult) => void;
  isLoading: boolean;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export function InvoiceChatPanel({
  isOpen,
  onClose,
  invoiceData,
  imageBase64,
  onSendMessage,
  onRegenerateData,
  isLoading,
  messages,
  setMessages,
}: InvoiceChatPanelProps) {
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input quand le panel s'ouvre
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await onSendMessage(input.trim());

      // Vérifier si la réponse contient des données à régénérer
      let newData: FlexibleInvoiceAIResult | undefined;
      let cleanResponse = response;

      // Essayer d'extraire un JSON si présent
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        try {
          newData = JSON.parse(jsonMatch[1]);
          cleanResponse = response.replace(/```json\n?[\s\S]*?\n?```/, "").trim();
        } catch (e) {
          // Pas de JSON valide, on garde la réponse telle quelle
        }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: cleanResponse || "Voici les nouvelles données extraites selon vos instructions.",
        timestamp: new Date(),
        isRegenerationRequest: !!newData,
        newData,
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Chat error:", error);

      // Déterminer un message d'erreur plus descriptif
      let errorContent = "Désolé, une erreur s'est produite. ";

      if (error instanceof Error) {
        if (error.message.includes("API error: 429")) {
          errorContent = "⚠️ Trop de requêtes envoyées. Veuillez patienter quelques secondes avant de réessayer.";
        } else if (error.message.includes("API error: 401") || error.message.includes("API error: 403")) {
          errorContent = "⚠️ Problème d'authentification avec l'API. Veuillez vérifier votre clé API.";
        } else if (error.message.includes("API error: 500") || error.message.includes("API error: 502") || error.message.includes("API error: 503")) {
          errorContent = "⚠️ Le service IA est temporairement indisponible. Veuillez réessayer dans quelques instants.";
        } else if (error.message.includes("No content in response")) {
          errorContent = "⚠️ L'assistant n'a pas pu générer une réponse. Veuillez reformuler votre question.";
        } else if (error.message.includes("fetch") || error.message.includes("network")) {
          errorContent = "⚠️ Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.";
        } else {
          errorContent += "Veuillez réessayer ou reformuler votre question.";
        }
      } else {
        errorContent += "Veuillez réessayer.";
      }

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApplyChanges = (newData: FlexibleInvoiceAIResult) => {
    onRegenerateData(newData);
    const confirmMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "assistant",
      content: "✅ Les modifications ont été appliquées au tableau !",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, confirmMessage]);
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col bg-card border border-border rounded-xl shadow-2xl transition-all duration-300",
        isMinimized ? "w-72 h-14" : "w-96 h-[500px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-violet-500 to-purple-600 rounded-t-xl">
        <div className="flex items-center gap-2 text-white">
          <MessageSquare className="h-5 w-5" />
          <span className="font-semibold">Assistant Facture</span>
          {isLoading && <LoadingSpinner size="sm" className="text-white" />}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-7 w-7 text-white hover:bg-white/20"
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Posez des questions sur votre facture ou demandez des modifications
                </p>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => setInput("Peux-tu vérifier si le total est correct ?")}
                    className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors"
                  >
                    Vérifier le total
                  </button>
                  <button
                    onClick={() => setInput("Ajoute une colonne avec les prix en FCFA")}
                    className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors ml-2"
                  >
                    Ajouter prix FCFA
                  </button>
                  <button
                    onClick={() => setInput("Retire le champ TVA du tableau")}
                    className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors"
                  >
                    Retirer TVA
                  </button>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Bouton pour appliquer les modifications */}
                  {message.isRegenerationRequest && message.newData && (
                    <Button
                      size="sm"
                      onClick={() => handleApplyChanges(message.newData!)}
                      className="mt-2 gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Appliquer ces modifications
                    </Button>
                  )}

                  <span className="text-[10px] opacity-60 block mt-1">
                    {message.timestamp.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez une question sur la facture..."
                className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px] max-h-[100px]"
                rows={1}
                disabled={isLoading || !invoiceData}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading || !invoiceData}
                className="h-10 w-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!invoiceData && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Analysez d'abord une facture pour discuter avec l'assistant
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Bouton flottant pour ouvrir le chat
export function ChatToggleButton({
  onClick,
  hasMessages,
}: {
  onClick: () => void;
  hasMessages: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
    >
      <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
      {hasMessages && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
          !
        </span>
      )}
    </button>
  );
}
