import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Home from "@/pages/home";
import Properties from "@/pages/properties";
import Valuation from "@/pages/valuation";
import Portfolio from "@/pages/portfolio";
import HeatMap from "@/pages/heatmap";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function Router() {
  // Ensure each route change scrolls to top
  useEffect(() => {
    // On initial mount and on each render triggered by route switch, scroll to top
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
  });
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/properties" component={Properties} />
        <Route path="/valuation" component={Valuation} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/heatmap" component={HeatMap} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
