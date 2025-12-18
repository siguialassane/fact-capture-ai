import { useState, useRef, useEffect } from "react";
import {
    Send,
    Bot,
    User,
    RefreshCw,
    Sparkles,
    ChevronDown,
    ChevronUp,
    ImageIcon,
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

interface InvoiceChatInlineProps {
    invoiceData: FlexibleInvoiceAIResult | null;
    onSendMessage: (message: string, forceReanalyze?: boolean) => Promise<string>;
    onRegenerateData: (newData: FlexibleInvoiceAIResult) => void;
    isLoading: boolean;
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    hasImage: boolean;
}

export function InvoiceChatInline({
    invoiceData,
    onSendMessage,
    onRegenerateData,
    isLoading,
    messages,
    setMessages,
    hasImage,
}: InvoiceChatInlineProps) {
    const [input, setInput] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll when new messages arrive
    useEffect(() => {
        if (isExpanded) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isExpanded]);

    // Focus input when expanded
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    const handleSend = async (forceReanalyze: boolean = false) => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: forceReanalyze ? `🔄 ${input.trim()}` : input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const messageToSend = input.trim();
        setInput("");

        try {
            const response = await onSendMessage(messageToSend, forceReanalyze);

            // Check if response contains data to regenerate
            let newData: FlexibleInvoiceAIResult | undefined;
            let cleanResponse = response;

            // Try to extract JSON if present
            const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
                try {
                    newData = JSON.parse(jsonMatch[1]);
                    cleanResponse = response.replace(/```json\n?[\s\S]*?\n?```/, "").trim();
                } catch {
                    // No valid JSON, keep response as-is
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

            let errorContent = "Désolé, une erreur s'est produite. ";

            if (error instanceof Error) {
                if (error.message.includes("API error: 429")) {
                    errorContent = "⚠️ Trop de requêtes. Patientez quelques secondes.";
                } else if (error.message.includes("API error: 401") || error.message.includes("API error: 403")) {
                    errorContent = "⚠️ Problème d'authentification API.";
                } else if (error.message.includes("API error: 500") || error.message.includes("API error: 502") || error.message.includes("API error: 503")) {
                    errorContent = "⚠️ Service IA temporairement indisponible.";
                } else if (error.message.includes("No content in response")) {
                    errorContent = "⚠️ Reformulez votre question.";
                } else if (error.message.includes("fetch") || error.message.includes("network")) {
                    errorContent = "⚠️ Problème de connexion réseau.";
                } else {
                    errorContent += "Réessayez.";
                }
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

    if (!invoiceData) return null;

    return (
        <div className="mt-6 border border-violet-200 rounded-xl overflow-hidden bg-gradient-to-b from-violet-50/50 to-white">
            {/* Header - Click to expand/collapse */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 transition-all"
            >
                <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5" />
                    <span className="font-semibold">Assistant IA</span>
                    {messages.length > 0 && (
                        <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                            {messages.length} message{messages.length > 1 ? "s" : ""}
                        </span>
                    )}
                    {isLoading && <LoadingSpinner size="sm" className="text-white" />}
                </div>
                {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                ) : (
                    <ChevronUp className="h-5 w-5" />
                )}
            </button>

            {/* Chat content - Expanded */}
            {isExpanded && (
                <div className="flex flex-col" style={{ maxHeight: "400px" }}>
                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[280px]">
                        {messages.length === 0 ? (
                            <div className="text-center py-6">
                                <Bot className="h-12 w-12 text-violet-300 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground mb-4">
                                    Posez des questions sur votre facture
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <button
                                        onClick={() => setInput("Vérifie si le total est correct")}
                                        className="text-xs bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-1.5 rounded-full transition-colors"
                                    >
                                        Vérifier le total
                                    </button>
                                    <button
                                        onClick={() => setInput("Convertis les prix en FCFA")}
                                        className="text-xs bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-1.5 rounded-full transition-colors"
                                    >
                                        Convertir en FCFA
                                    </button>
                                    <button
                                        onClick={() => setInput("Y a-t-il des anomalies ?")}
                                        className="text-xs bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-1.5 rounded-full transition-colors"
                                    >
                                        Chercher anomalies
                                    </button>
                                </div>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex gap-3",
                                        message.role === "user" ? "justify-end" : "justify-start"
                                    )}
                                >
                                    {message.role === "assistant" && (
                                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                            <Bot className="h-3.5 w-3.5 text-white" />
                                        </div>
                                    )}
                                    <div
                                        className={cn(
                                            "max-w-[85%] rounded-2xl px-4 py-2",
                                            message.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-br-md"
                                                : "bg-muted rounded-bl-md"
                                        )}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                                        {/* Button to apply modifications */}
                                        {message.isRegenerationRequest && message.newData && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleApplyChanges(message.newData!)}
                                                className="mt-2 gap-2 bg-green-600 hover:bg-green-700"
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                                Appliquer
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
                                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                                            <User className="h-3.5 w-3.5 text-primary-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="p-3 border-t border-violet-100 bg-white">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Posez une question sur la facture..."
                                className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px] max-h-[100px]"
                                rows={1}
                                disabled={isLoading}
                            />

                            {/* Re-analyze button */}
                            {hasImage && (
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => handleSend(true)}
                                    disabled={!input.trim() || isLoading}
                                    className="h-11 w-11 rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50"
                                    title="Ré-analyser l'image"
                                >
                                    <ImageIcon className="h-4 w-4" />
                                </Button>
                            )}

                            {/* Send button */}
                            <Button
                                size="icon"
                                onClick={() => handleSend(false)}
                                disabled={!input.trim() || isLoading}
                                className="h-11 w-11 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                            >
                                {isLoading ? (
                                    <LoadingSpinner size="sm" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        {hasImage && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                                💡 Cliquez sur 📷 pour ré-analyser l'image avec votre question
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
