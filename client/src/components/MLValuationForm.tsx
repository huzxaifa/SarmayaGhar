import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Brain, TrendingUp, Home, MapPin } from "lucide-react";
import { PAKISTANI_CITIES, PROPERTY_TYPES, BEDROOM_OPTIONS, BATHROOM_OPTIONS, formatCurrency } from "@/lib/constants";
import { useLocations } from "@/hooks/useProperties";
import { apiRequest } from "@/lib/queryClient";

const mlValuationSchema = z.object({
  city: z.string().min(1, "City is required"),
  location: z.string().min(1, "Location is required"),
  neighbourhood: z.string().optional(),
  propertyType: z.string().min(1, "Property type is required"),
  yearBuilt: z.coerce.number().min(1900, "Year built is required and must be after 1900"),
  areaMarla: z.coerce.number().min(0.1, "Area size must be greater than 0"),
  bedrooms: z.coerce.number().min(1, "At least 1 bedroom required"),
  bathrooms: z.coerce.number().min(1, "At least 1 bathroom required"),
  province: z.string().default("Sindh"),
});

type MLValuationFormData = z.infer<typeof mlValuationSchema>;

interface MLValuationResult {
  predictedPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  confidence: number;
  marketTrend: string;
  predictions: {
    currentYear: number;
    oneYear: number;
    twoYear: number;
    threeYear: number;
  };
  comparableProperties: Array<{
    price: number;
    location: string;
    areaMarla: number;
    bedrooms: number;
    bathrooms: number;
  }>;
  insights: string[];
}

interface TrainingStatus {
  isTraining: boolean;
  hasModel: boolean;
  modelInfo?: {
    bestModel: string;
    accuracy: number;
    newlyTrained?: Array<{
      name: string;
      accuracy: number;
    }>;
  };
  trainedModels?: Array<{
    name: string;
    trained: boolean;
    accuracy?: number;
  }>;
  untrainedModels?: string[];
}

export default function MLValuationForm() {
  const [result, setResult] = useState<MLValuationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({ isTraining: false, hasModel: false });
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const form = useForm<MLValuationFormData>({
    resolver: zodResolver(mlValuationSchema),
    defaultValues: {
      province: "Sindh",
    },
  });

  // Dependent locations based on selected city
  const selectedCity = form.watch("city");
  const { data: locationsData, isLoading: locationsLoading } = useLocations(selectedCity);
  const locationOptions = locationsData?.locations || [];

  // Check training status on component mount
  useEffect(() => {
    const checkTrainingStatus = async () => {
      try {
        // Get model status first
        const modelStatusResponse = await apiRequest('GET', '/api/ml/model-status');
        const modelStatus = await modelStatusResponse.json();
        
        // Get training status
        const trainingResponse = await apiRequest('GET', '/api/ml/training-status');
        const trainingStatusResponse = await trainingResponse.json();
        
        // Consider models ready only if the server reports an in-memory trained model
        setTrainingStatus({
          isTraining: false,
          hasModel: !!trainingStatusResponse?.hasModel,
          modelInfo: trainingStatusResponse.modelInfo,
          trainedModels: modelStatus.trainedModels,
          untrainedModels: modelStatus.untrainedModels
        });
      } catch (error) {
        console.error('Error checking training status:', error);
        setTrainingStatus({ isTraining: false, hasModel: false });
      } finally {
        setIsCheckingStatus(false);
      }
    };
    checkTrainingStatus();
  }, []);

  const startTraining = async () => {
    try {
      setTrainingStatus(prev => ({ ...prev, isTraining: true }));
      const response = await apiRequest('POST', '/api/ml/train-models');
      const result = await response.json();
      
      if (result.success) {
        // Re-fetch model status after training
        const modelStatusResponse = await apiRequest('GET', '/api/ml/model-status');
        const modelStatus = await modelStatusResponse.json();
        
        setTrainingStatus({
          isTraining: false,
          hasModel: true,
          modelInfo: result.modelInfo,
          trainedModels: modelStatus.trainedModels,
          untrainedModels: modelStatus.untrainedModels
        });
      } else {
        console.error('Training failed:', result.message);
        setTrainingStatus(prev => ({ ...prev, isTraining: false }));
      }
    } catch (error) {
      console.error('Error starting training:', error);
      setTrainingStatus(prev => ({ ...prev, isTraining: false }));
    }
  };

  const onSubmit = async (data: MLValuationFormData) => {
    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/ml/property-valuation', data);
      const result = await response.json();
      setResult(result);
    } catch (error) {
      console.error("Valuation error:", error);
      // Check if it's a training error
      if ((error as any)?.message?.includes('train')) {
        setTrainingStatus({ isTraining: false, hasModel: false });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-primary mb-4 flex items-center justify-center gap-3">
          <Brain className="h-8 w-8" />
          AI Property Valuation Tool
        </h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Get instant, accurate property valuations using our advanced machine learning models trained on 168K+ Pakistani real estate records.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Valuation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-city">
                              <SelectValue placeholder="Select City" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAKISTANI_CITIES.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location/Area *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCity || locationsLoading}>
                          <FormControl>
                            <SelectTrigger data-testid="select-location">
                              <SelectValue placeholder={selectedCity ? (locationsLoading ? "Loading..." : "Select Location") : "Select City first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locationOptions.map((loc) => (
                              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-property-type">
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="neighbourhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Neighbourhood</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Phase 6, Block A" 
                            {...field} 
                            data-testid="input-neighbourhood"
                            className="placeholder:text-muted-foreground/70"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                  <FormField
                    control={form.control}
                    name="yearBuilt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Built *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g. 2020" 
                            min="1950" 
                            max="2025" 
                            {...field} 
                            data-testid="input-year-built"
                            className="placeholder:text-muted-foreground/70"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="areaMarla"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area (Marla) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g. 5" 
                            step="0.1" 
                            {...field} 
                            data-testid="input-area-marla"
                            className="placeholder:text-muted-foreground/70"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrooms *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-bedrooms">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BEDROOM_OPTIONS.map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bathrooms *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-bathrooms">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BATHROOM_OPTIONS.map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* ML Training Status */}
                {isCheckingStatus ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Checking ML model status...</span>
                  </div>
                ) : !trainingStatus.hasModel ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          ML Models Not Trained
                        </h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Train machine learning models on 168K+ real estate records to get accurate predictions
                        </p>
                        {trainingStatus.untrainedModels && trainingStatus.untrainedModels.length > 0 && (
                          <div className="text-sm text-yellow-700 mt-2">
                            <p className="font-medium">Missing models:</p>
                            <ul className="list-disc list-inside mt-1">
                              {trainingStatus.untrainedModels.map((model) => (
                                <li key={model}>{model}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={startTraining}
                        disabled={trainingStatus.isTraining}
                        variant="outline"
                        size="sm"
                        data-testid="button-train-models"
                      >
                        {trainingStatus.isTraining ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Training...
                          </>
                        ) : (
                          <>
                            <Brain className="mr-2 h-4 w-4" />
                            Train Models
                          </>
                        )}
                      </Button>
                    </div>
                    {trainingStatus.isTraining && (
                      <div className="text-sm text-yellow-700">
                        {trainingStatus.untrainedModels && trainingStatus.untrainedModels.length > 0 
                          ? `Training missing models: ${trainingStatus.untrainedModels.join(', ')}...`
                          : 'Training multiple ML models (Decision Tree, Random Forest, XGBoost, Deep Learning)...'
                        }
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">
                        ML Models Ready: {trainingStatus.modelInfo?.bestModel} 
                        (Accuracy: {((trainingStatus.modelInfo?.accuracy || 0) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg" 
                  disabled={isLoading || !trainingStatus.hasModel}
                  data-testid="button-get-valuation"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculating with ML Models...
                    </>
                  ) : !trainingStatus.hasModel ? (
                    "Train Models First"
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Get AI Property Valuation
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Valuation Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              AI Valuation Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6">
                {/* Main Valuation */}
                <div className="text-center bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl p-6">
                  <div className="text-sm opacity-90 mb-2">ML Predicted Value</div>
                  <div className="text-4xl font-bold mb-2" data-testid="valuation-predicted-price">
                    {formatCurrency(result.predictedPrice)}
                  </div>
                  <div className="text-sm opacity-90">
                    Range: {formatCurrency(result.priceRange.min)} - {formatCurrency(result.priceRange.max)}
                  </div>
                </div>
                
                {/* Confidence Score */}
                <div className="bg-muted rounded-lg p-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium">ML Model Confidence</span>
                    <span className="text-2xl font-bold text-green-600" data-testid="valuation-confidence-score">
                      {result.confidence}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full" 
                      style={{ width: `${result.confidence}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Price per Marla</div>
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(result.predictedPrice / (form.getValues("areaMarla") || 1))}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Market Trend</div>
                    <div className="text-lg font-bold text-green-600">
                      {result.marketTrend}
                    </div>
                  </div>
                </div>
                
                {/* Future Predictions */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-primary">Price Predictions</h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Current</div>
                      <div className="text-sm font-bold text-blue-600">
                        {formatCurrency(result.predictions.currentYear)}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">1 Year</div>
                      <div className="text-sm font-bold text-green-600">
                        {formatCurrency(result.predictions.oneYear)}
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">2 Years</div>
                      <div className="text-sm font-bold text-orange-600">
                        {formatCurrency(result.predictions.twoYear)}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">3 Years</div>
                      <div className="text-sm font-bold text-purple-600">
                        {formatCurrency(result.predictions.threeYear)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Comparable Properties */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-primary flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Comparable Properties
                  </h4>
                  <div className="space-y-3">
                    {result.comparableProperties.map((property, index) => (
                      <div key={index} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{property.location}</div>
                            <div className="text-sm text-muted-foreground">
                              {property.areaMarla} Marla • {property.bedrooms} Bed • {property.bathrooms} Bath
                            </div>
                          </div>
                          <div className="font-bold text-primary">
                            {formatCurrency(property.price)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* AI Insights */}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    ML Model Insights
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {result.insights.map((insight, index) => (
                      <li key={index}>• {insight}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-muted-foreground mb-4">
                  Fill out the form to get your AI-powered property valuation
                </div>
                <div className="text-sm text-muted-foreground">
                  Our ML models analyze 168K+ real estate records using Decision Tree, Random Forest, XGBoost, and Deep Learning algorithms to provide accurate valuations
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}