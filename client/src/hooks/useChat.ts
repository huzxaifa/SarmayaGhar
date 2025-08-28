import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@/lib/types";

interface ChatResponse {
  message: string;
  suggestions?: string[];
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      message: "Welcome! I'm your AI real estate investment advisor. I can help you with property valuations, market analysis, investment strategies, and answer any questions about the Pakistani real estate market. How can I assist you today?",
      response: "",
      isUser: false,
      timestamp: new Date(),
    }
  ]);

  const chatMutation = useMutation<ChatResponse, Error, { message: string; context?: any }>({
    mutationFn: async ({ message, context }) => {
      const response = await apiRequest('POST', '/api/ml/chatbot', { message, context });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        message: variables.message,
        response: "",
        isUser: true,
        timestamp: new Date(),
      };

      // Add AI response
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: data.message,
        response: "",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage, aiMessage]);
    },
  });

  const sendMessage = (message: string, context?: any) => {
    chatMutation.mutate({ message, context });
  };

  return {
    messages,
    sendMessage,
    isLoading: chatMutation.isPending,
    error: chatMutation.error,
  };
}
