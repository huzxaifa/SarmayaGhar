import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useValuation } from "@/hooks/useValuation";
import { PAKISTANI_CITIES, PROPERTY_TYPES, PROPERTY_FEATURES, BEDROOM_OPTIONS, BATHROOM_OPTIONS, PREDICTION_TIMELINES, formatCurrency } from "@/lib/constants";
import type { ValuationResult } from "@/lib/types";

const valuationSchema = z.object({
  city: z.string().min(1, "City is required"),
  area: z.string().min(1, "Area is required"),
  propertyType: z.string().min(1, "Property type is required"),
  yearBuilt: z.coerce.number().optional(),
  areaSize: z.coerce.number().min(0.1, "Area size must be greater than 0"),
  areaUnit: z.string().default("marla"),
  bedrooms: z.coerce.number().min(1, "At least 1 bedroom required"),
  bathrooms: z.coerce.number().min(1, "At least 1 bathroom required"),
  features: z.array(z.string()).default([]),
  predictionTimeline: z.string().default("current"),
});

type ValuationFormData = z.infer<typeof valuationSchema>;

export default function ValuationForm() {
  const [result, setResult] = useState<ValuationResult | null>(null);
  const valuationMutation = useValuation();

  const form = useForm<ValuationFormData>({
    resolver: zodResolver(valuationSchema),
    defaultValues: {
      areaUnit: "marla",
      features: [],
      predictionTimeline: "current",
    },
  });

  const onSubmit = async (data: ValuationFormData) => {
    try {
      const result = await valuationMutation.mutateAsync(data);
      setResult(result);
    } catch (error) {
      console.error("Valuation error:", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-primary mb-4">AI Property Valuation Tool</h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Get instant, accurate property valuations using our advanced machine learning models trained on extensive Pakistani real estate data.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Valuation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
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
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area/Neighbourhood *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. DHA Phase 6" {...field} data-testid="input-area" />
                        </FormControl>
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
                    name="yearBuilt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Built</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g. 2020" 
                            min="1950" 
                            max="2025" 
                            {...field} 
                            data-testid="input-year-built"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="areaSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area (Marla) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g. 5" 
                            step="0.1" 
                            {...field} 
                            data-testid="input-area-size"
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
                
                {/* Additional Features */}
                <FormField
                  control={form.control}
                  name="features"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Features</FormLabel>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {PROPERTY_FEATURES.map((feature) => (
                          <div key={feature} className="flex items-center space-x-2">
                            <Checkbox
                              id={feature}
                              checked={field.value?.includes(feature)}
                              onCheckedChange={(checked) => {
                                const updatedFeatures = checked
                                  ? [...(field.value || []), feature]
                                  : field.value?.filter((f) => f !== feature) || [];
                                field.onChange(updatedFeatures);
                              }}
                              data-testid={`checkbox-${feature.toLowerCase().replace(" ", "-")}`}
                            />
                            <Label htmlFor={feature} className="text-sm">
                              {feature}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
                
                {/* Prediction Timeline */}
                <FormField
                  control={form.control}
                  name="predictionTimeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prediction Timeline</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          {PREDICTION_TIMELINES.map((timeline) => (
                            <div key={timeline.value} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={timeline.value} 
                                id={timeline.value}
                                data-testid={`radio-${timeline.value}`}
                              />
                              <Label htmlFor={timeline.value} className="text-sm">
                                {timeline.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg" 
                  disabled={valuationMutation.isPending}
                  data-testid="button-get-valuation"
                >
                  {valuationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    "Get Detailed AI Valuation"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Valuation Results */}
        <Card>
          <CardHeader>
            <CardTitle>AI Valuation Report</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6">
                {/* Main Valuation */}
                <div className="text-center bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl p-6">
                  <div className="text-sm opacity-90 mb-2">Estimated Market Value</div>
                  <div className="text-4xl font-bold mb-2" data-testid="valuation-estimated-value">
                    {formatCurrency(result.estimatedValue)}
                  </div>
                  <div className="text-sm opacity-90">
                    Range: {formatCurrency(result.priceRange.min)} - {formatCurrency(result.priceRange.max)}
                  </div>
                </div>
                
                {/* Confidence Score */}
                <div className="bg-muted rounded-lg p-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium">AI Confidence Score</span>
                    <span className="text-2xl font-bold text-green-600" data-testid="valuation-confidence-score">
                      {result.confidenceScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full" 
                      style={{ width: `${result.confidenceScore}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Price per Marla</div>
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(result.estimatedValue / (form.getValues("areaSize") || 1))}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Location Score</div>
                    <div className="text-lg font-bold text-green-600">
                      {result.marketAnalysis.locationScore}/10
                    </div>
                  </div>
                </div>
                
                {/* Market Analysis */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-primary">Market Analysis</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Market Trend:</span>
                      <span className="font-semibold text-green-600">{result.marketAnalysis.marketTrend}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Liquidity:</span>
                      <span className="font-semibold text-orange-600">{result.marketAnalysis.liquidity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Investment Grade:</span>
                      <span className="font-semibold text-green-600">{result.marketAnalysis.investmentGrade}</span>
                    </div>
                  </div>
                </div>
                
                {/* AI Insights */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">AI Insights</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {result.insights.map((insight, index) => (
                      <li key={index}>• {insight}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  Fill out the form to get your AI-powered property valuation
                </div>
                <div className="text-sm text-muted-foreground">
                  Our advanced machine learning models will analyze your property and provide accurate market insights
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
