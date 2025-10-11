import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const scrollToChat = () => {
    const chatSection = document.getElementById('chat-section');
    if (chatSection) {
      chatSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>{children}</main>
      <Footer />
      
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={scrollToChat}
          className="bg-accent hover:bg-accent/90 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
          data-testid="button-floating-chat"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
