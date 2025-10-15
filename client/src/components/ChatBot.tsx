import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { useChat } from "@/hooks/useChat";

export default function ChatBot() {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, isLoading } = useChat();

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    } else {
      // fallback (should not scroll the whole page)
      messagesEndRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  useEffect(() => {
    if (messages && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading) {
      sendMessage(inputMessage.trim());
      setInputMessage("");
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
  };

  const quickQuestions = [
    "Best ROI areas in Lahore?",
    "Market crash prediction?",
    "Commercial vs residential?",
    "Property tax implications?",
  ];

  return (
    <div id="chat-section" className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-primary mb-4">AI Investment Advisor</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get personalized investment advice, market insights, and property recommendations from our intelligent AI assistant.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden shadow-xl">
            {/* Chat Header */}
            <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
              <CardTitle className="flex items-center">
                <div className="bg-white/20 rounded-full p-3 mr-4">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">SarmayaGhar AI Assistant</h3>
                  <p className="text-sm opacity-90">Powered by OpenAI - Real Estate Investment Expert</p>
                </div>
              </CardTitle>
            </CardHeader>
            
            {/* Chat Messages */}
            <CardContent className="p-0">
              <div ref={containerRef} className="h-96 overflow-y-auto p-6 space-y-4" data-testid="chat-messages-container">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.isUser ? "justify-end" : ""
                    }`}
                    data-testid={`chat-message-${message.id}`}
                  >
                    {!message.isUser && (
                      <div className="bg-primary rounded-full p-2 text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    
                    <div
                      className={`rounded-lg p-4 max-w-md ${
                        message.isUser
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted rounded-tl-none"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    </div>
                    
                    {message.isUser && (
                      <div className="bg-muted rounded-full p-2">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary rounded-full p-2 text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted rounded-lg rounded-tl-none p-4 max-w-md">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
              
              {/* Chat Input */}
              <div className="border-t p-6">
                <form onSubmit={handleSubmit} className="flex space-x-4">
                  <Input
                    type="text"
                    placeholder="Ask about property investments, market trends, or specific areas..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isLoading}
                    className="flex-1"
                    data-testid="input-chat-message"
                  />
                  <Button 
                    type="submit" 
                    disabled={isLoading || !inputMessage.trim()}
                    data-testid="button-send-message"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
                
                {/* Quick Questions */}
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Quick questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickQuestion(question)}
                        disabled={isLoading}
                        data-testid={`button-quick-question-${index}`}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
