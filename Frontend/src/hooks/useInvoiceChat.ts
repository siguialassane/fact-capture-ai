import { useState, useCallback } from "react";
import {
  chatWithInvoiceContext,
  type FlexibleInvoiceAIResult,
  type ChatContext,
} from "@/lib/openrouter";
import { updateInvoiceAIResult } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseInvoiceChatOptions {
  onDataRegenerated?: (newData: FlexibleInvoiceAIResult) => void;
}

interface UseInvoiceChatReturn {
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isChatLoading: boolean;
  conversationHistory: ConversationMessage[];
  sendMessage: (
    message: string,
    invoiceData: FlexibleInvoiceAIResult,
    imageBase64: string | null,
    forceReanalyze?: boolean
  ) => Promise<string>;
  regenerateData: (newData: FlexibleInvoiceAIResult, supabaseRecordId?: number) => void;
  resetChat: () => void;
}

export function useInvoiceChat(
  options: UseInvoiceChatOptions = {}
): UseInvoiceChatReturn {
  const { onDataRegenerated } = options;
  const { toast } = useToast();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  /**
   * Send a chat message and get AI response
   */
  const sendMessage = useCallback(
    async (
      message: string,
      invoiceData: FlexibleInvoiceAIResult,
      imageBase64: string | null,
      forceReanalyze: boolean = false
    ): Promise<string> => {
      setIsChatLoading(true);

      try {
        const context: ChatContext = {
          invoiceData,
          imageBase64,
          conversationHistory,
        };

        const response = await chatWithInvoiceContext(message, context, forceReanalyze);

        // Update conversation history
        setConversationHistory((prev) => [
          ...prev,
          { role: "user" as const, content: message },
          { role: "assistant" as const, content: response },
        ]);

        return response;
      } finally {
        setIsChatLoading(false);
      }
    },
    [conversationHistory]
  );

  /**
   * Handle data regeneration from chat response
   */
  const regenerateData = useCallback(
    (newData: FlexibleInvoiceAIResult, supabaseRecordId?: number) => {
      onDataRegenerated?.(newData);

      // Update in Supabase if we have a record ID
      if (supabaseRecordId) {
        updateInvoiceAIResult(supabaseRecordId, newData);
      }

      toast({
        title: "Données mises à jour",
        description: "Le tableau a été mis à jour selon vos instructions.",
      });
    },
    [toast, onDataRegenerated]
  );

  /**
   * Reset chat state
   */
  const resetChat = useCallback(() => {
    setChatMessages([]);
    setConversationHistory([]);
  }, []);

  return {
    chatMessages,
    setChatMessages,
    isChatLoading,
    conversationHistory,
    sendMessage,
    regenerateData,
    resetChat,
  };
}
