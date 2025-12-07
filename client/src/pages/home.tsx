import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Activity, Map, PieChart, MessageCircle, Home as HomeIcon, Calculator, Loader2 } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import { useValuation } from "@/hooks/useValuation";
import PropertyCard from "@/components/PropertyCard";
import ChatBot from "@/components/ChatBot";
import HeatMap from "@/components/HeatMap";
import { PAKISTANI_CITIES, PROPERTY_TYPES, BEDROOM_OPTIONS } from "@/lib/constants";

const quickValuationSchema = z.object({
  city: z.string().min(1, "City is required"),
  propertyType: z.string().min(1, "Property type is required"),
  areaSize: z.coerce.number().min(0.1, "Area size must be greater than 0"),
  bedrooms: z.coerce.number().min(1, "At least 1 bedroom required"),
});

type QuickValuationData = z.infer<typeof quickValuationSchema>;

export default function Home() {
  const [quickValuationResult, setQuickValuationResult] = useState<any>(null);
  const { data, isLoading: propertiesLoading } = useProperties();
  const valuationMutation = useValuation();

  const quickForm = useForm<QuickValuationData>({
    resolver: zodResolver(quickValuationSchema),
    defaultValues: {
      areaSize: 5,
      bedrooms: 3,
    },
  });

  const onQuickValuation = async (data: QuickValuationData) => {
    try {
      const result = await valuationMutation.mutateAsync({
        ...data,
        area: "Central Area",
        areaUnit: "marla",
        bathrooms: 3,
        features: [],
        predictionTimeline: "current",
      });
      setQuickValuationResult(result);
    } catch (error) {
      console.error("Quick valuation error:", error);
    }
  };

  const featuredProperties = (data?.items || []).slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
                Pakistan's First ML-Powered Real Estate Platform
              </h1>
              <p className="text-xl lg:text-2xl text-primary-foreground/80 mb-8 leading-relaxed">
                Make smarter property investments with advanced machine learning models trained on Pakistani real estate data from Zameen and Graana.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link href="/valuation">
                  <Button size="lg" variant="secondary" className="px-8 py-4 text-lg" data-testid="button-start-valuation">
                    Start Free Valuation
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="px-8 py-4 text-lg border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" data-testid="button-watch-demo">
                  Watch Demo
                </Button>
              </div>
              
              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-300" data-testid="stat-properties">50K+</div>
                  <div className="text-primary-foreground/80 text-sm">Properties Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-300" data-testid="stat-accuracy">92%</div>
                  <div className="text-primary-foreground/80 text-sm">Accuracy Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-300" data-testid="stat-cities">3</div>
                  <div className="text-primary-foreground/80 text-sm">Major Cities</div>
                </div>
              </div>
            </div>
            
            {/* Quick Valuation Widget */}
            <Card className="text-foreground shadow-2xl">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-primary mb-6">Quick Property Valuation</h3>
                
                <Form {...quickForm}>
                  <form onSubmit={quickForm.handleSubmit(onQuickValuation)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={quickForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-quick-city">
                                  <SelectValue placeholder="Select City" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PAKISTANI_CITIES.slice(0, 3).map((city) => (
                                  <SelectItem key={city} value={city}>
                                    {city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={quickForm.control}
                        name="propertyType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-quick-property-type">
                                  <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PROPERTY_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={quickForm.control}
                        name="areaSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Area (Marla)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g. 5" step="0.1" {...field} data-testid="input-quick-area" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={quickForm.control}
                        name="bedrooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bedrooms</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger data-testid="select-quick-bedrooms">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {BEDROOM_OPTIONS.slice(0, 4).map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg" 
                      disabled={valuationMutation.isPending}
                      data-testid="button-quick-valuation"
                    >
                      {valuationMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        "Get AI Valuation"
                      )}
                    </Button>
                  </form>
                </Form>

                {quickValuationResult && (
                  <div className="mt-6 p-4 bg-accent/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-2" data-testid="quick-valuation-result">
                      PKR {(quickValuationResult.estimatedValue / 10000000).toFixed(1)} Cr
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Confidence: {quickValuationResult.confidenceScore}/100
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary mb-4">Powered by Advanced AI & Machine Learning</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our proprietary models analyze millions of data points from Pakistani real estate market to provide accurate valuations and investment insights.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Property Valuation Feature */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="bg-accent w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                  <TrendingUp className="text-accent-foreground h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">AI Property Valuation</h3>
                <p className="text-muted-foreground mb-4">
                  Get instant, accurate property valuations using ML models trained on Pakistani real estate data with 92% accuracy rate.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Real-time market analysis</li>
                  <li>• Confidence scoring</li>
                  <li>• Multi-year predictions</li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Rental Yield Feature */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="bg-green-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                  <DollarSign className="text-white h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">Rental Yield & ROI</h3>
                <p className="text-muted-foreground mb-4">
                  Calculate potential rental income and return on investment for any property with our advanced prediction models.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Expected rental yields</li>
                  <li>• ROI projections</li>
                  <li>• Investment comparisons</li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Market Insights Feature */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="bg-orange-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                  <Activity className="text-white h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">Market Predictions</h3>
                <p className="text-muted-foreground mb-4">
                  Predict market trends, identify boom and crash cycles, and time your investments perfectly.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• 3-year forecasting</li>
                  <li>• Trend analysis</li>
                  <li>• Risk assessment</li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Interactive Heatmap Feature */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="bg-purple-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                  <Map className="text-white h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">Interactive Heatmaps</h3>
                <p className="text-muted-foreground mb-4">
                  Visualize property values, ROI potential, and market trends across Pakistani cities on interactive maps.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Price distribution</li>
                  <li>• Growth potential</li>
                  <li>• Investment hotspots</li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Portfolio Management Feature */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="bg-indigo-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                  <PieChart className="text-white h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">Portfolio Management</h3>
                <p className="text-muted-foreground mb-4">
                  Track your real estate investments, monitor performance, and get AI-powered optimization recommendations.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Performance tracking</li>
                  <li>• Diversification advice</li>
                  <li>• Growth analytics</li>
                </ul>
              </CardContent>
            </Card>
            
            {/* AI Chatbot Feature */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="bg-green-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                  <MessageCircle className="text-white h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">AI Investment Advisor</h3>
                <p className="text-muted-foreground mb-4">
                  Get personalized investment advice and market insights through our intelligent chatbot powered by Llama 3.1.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• 24/7 availability</li>
                  <li>• Contextual advice</li>
                  <li>• Market updates</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="py-20 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl font-bold text-primary mb-4">Featured Properties</h2>
              <p className="text-xl text-muted-foreground">AI-analyzed properties with detailed market insights</p>
            </div>
            <Link href="/properties">
              <Button data-testid="button-view-all-properties">
                View All Properties
              </Button>
            </Link>
          </div>
          
          {propertiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted-foreground/20"></div>
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
                    <div className="h-4 bg-muted-foreground/20 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Heatmap Section */}
      <HeatMap />

      {/* ChatBot Section */}
      <ChatBot />
    </div>
  );
}
