import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Brain, TrendingUp, Home, MapPin, DollarSign, Calculator, PieChart } from "lucide-react";
import { PAKISTANI_CITIES, PROPERTY_TYPES, BEDROOM_OPTIONS, BATHROOM_OPTIONS, formatCurrency } from "@/lib/constants";

const rentalAnalysisSchema = z.object({
  city: z.string().min(1, "City is required"),
  location: z.string().min(1, "Location is required"),
  propertyType: z.string().min(1, "Property type is required"),
  yearBuilt: z.coerce.number().min(1900, "Year built is required and must be after 1900"),
  areaMarla: z.coerce.number().min(0.1, "Area size must be greater than 0"),
  bedrooms: z.coerce.number().min(1, "At least 1 bedroom required"),
  bathrooms: z.coerce.number().min(1, "At least 1 bathroom required"),
  purchasePrice: z.coerce.number().min(1, "Purchase price is required"),
  monthlyMaintenance: z.coerce.number().min(0, "Maintenance cost cannot be negative").default(0),
  propertyTax: z.coerce.number().min(0, "Property tax cannot be negative").default(0),
});

type RentalAnalysisFormData = z.infer<typeof rentalAnalysisSchema>;

interface RentalAnalysisResult {
  predictedRent: number;
  rentRange: {
    min: number;
    max: number;
  };
  confidence: number;
  roiAnalysis: {
    monthlyROI: number;
    annualROI: number;
    monthlyCashFlow: number;
    annualCashFlow: number;
    totalROI: number;
  };
  marketInsights: {
    rentalYield: number;
    marketTrend: string;
    occupancyRate: string;
    demandLevel: string;
  };
  comparableRentals: Array<{
    rent: number;
    location: string;
    areaMarla: number;
    bedrooms: number;
    bathrooms: number;
  }>;
  insights: string[];
}

export default function RentalAnalysisForm() {
  const [result, setResult] = useState<RentalAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RentalAnalysisFormData>({
    resolver: zodResolver(rentalAnalysisSchema),
    defaultValues: {
      city: "",
      location: "",
      propertyType: "",
      yearBuilt: new Date().getFullYear(),
      areaMarla: 5,
      bedrooms: 3,
      bathrooms: 2,
      purchasePrice: 0,
      monthlyMaintenance: 0,
      propertyTax: 0,
    },
  });

  const onSubmit = async (data: RentalAnalysisFormData) => {
    setIsLoading(true);
    setResult(null);

    try {
      // Simulate API call - replace with actual rental model prediction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock result for now - will be replaced with actual model prediction
      const mockResult: RentalAnalysisResult = {
        predictedRent: Math.floor(data.purchasePrice * 0.008), // 0.8% of property value
        rentRange: {
          min: Math.floor(data.purchasePrice * 0.006),
          max: Math.floor(data.purchasePrice * 0.01),
        },
        confidence: 85,
        roiAnalysis: {
          monthlyROI: 0.8,
          annualROI: 9.6,
          monthlyCashFlow: Math.floor(data.purchasePrice * 0.008) - data.monthlyMaintenance - (data.propertyTax / 12),
          annualCashFlow: (Math.floor(data.purchasePrice * 0.008) - data.monthlyMaintenance) * 12 - data.propertyTax,
          totalROI: 9.6,
        },
        marketInsights: {
          rentalYield: 9.6,
          marketTrend: "Stable",
          occupancyRate: "85%",
          demandLevel: "High",
        },
        comparableRentals: [
          {
            rent: Math.floor(data.purchasePrice * 0.007),
            location: data.location,
            areaMarla: data.areaMarla,
            bedrooms: data.bedrooms,
            bathrooms: data.bathrooms,
          },
          {
            rent: Math.floor(data.purchasePrice * 0.009),
            location: data.location,
            areaMarla: data.areaMarla + 2,
            bedrooms: data.bedrooms + 1,
            bathrooms: data.bathrooms,
          },
        ],
        insights: [
          `Rental yield of ${9.6}% is above market average`,
          "High demand area with stable rental market",
          "Property size and amenities align with market expectations",
          "Consider minor renovations to increase rental value",
        ],
      };

      setResult(mockResult);
    } catch (error) {
      console.error("Rental analysis error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-accent w-16 h-16 rounded-2xl flex items-center justify-center mr-4">
              <DollarSign className="text-accent-foreground h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-2">
                Rental Analysis & ROI Calculator
              </h1>
              <p className="text-xl text-muted-foreground">
                AI-powered rental income prediction and investment analysis
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Home className="mr-3 h-6 w-6 text-accent" />
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Location Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
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
                          <FormLabel>Location/Area</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., DHA Phase 5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Property Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="propertyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
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
                            <Input type="number" placeholder="2020" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Size Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="areaMarla"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Area (Marla)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="5.0" {...field} />
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
                          <FormLabel>Bedrooms</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
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
                          <FormLabel>Bathrooms</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
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

                  {/* Investment Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary flex items-center">
                      <Calculator className="mr-2 h-5 w-5" />
                      Investment Analysis
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="purchasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Price (PKR)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="10000000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="monthlyMaintenance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Maintenance (PKR)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="5000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="propertyTax"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Annual Property Tax (PKR)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="50000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Rental Potential...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Analyze Rental Investment
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="space-y-6">
            {result && (
              <>
                {/* Predicted Rent */}
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                      <TrendingUp className="mr-3 h-6 w-6 text-green-500" />
                      Predicted Rental Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-6">
                      <div className="text-4xl font-bold text-primary mb-2">
                        {formatCurrency(result.predictedRent)}/month
                      </div>
                      <div className="text-lg text-muted-foreground">
                        Range: {formatCurrency(result.rentRange.min)} - {formatCurrency(result.rentRange.max)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        Confidence: {result.confidence}%
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ROI Analysis */}
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                      <PieChart className="mr-3 h-6 w-6 text-blue-500" />
                      ROI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {result.roiAnalysis.annualROI.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Annual ROI</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(result.roiAnalysis.annualCashFlow)}
                        </div>
                        <div className="text-sm text-muted-foreground">Annual Cash Flow</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly ROI:</span>
                        <span className="font-semibold">{result.roiAnalysis.monthlyROI.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Cash Flow:</span>
                        <span className="font-semibold">{formatCurrency(result.roiAnalysis.monthlyCashFlow)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rental Yield:</span>
                        <span className="font-semibold">{result.marketInsights.rentalYield.toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Market Insights */}
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                      <MapPin className="mr-3 h-6 w-6 text-purple-500" />
                      Market Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">
                          {result.marketInsights.marketTrend}
                        </div>
                        <div className="text-sm text-muted-foreground">Market Trend</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-lg font-bold text-orange-600">
                          {result.marketInsights.occupancyRate}
                        </div>
                        <div className="text-sm text-muted-foreground">Occupancy Rate</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Demand Level:</span>
                        <span className="font-semibold">{result.marketInsights.demandLevel}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Insights */}
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl">Investment Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.insights.map((insight, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-accent rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-muted-foreground">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </>
            )}

            {!result && !isLoading && (
              <Card className="shadow-xl">
                <CardContent className="p-12 text-center">
                  <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-primary mb-2">
                    Ready to Analyze Your Rental Investment?
                  </h3>
                  <p className="text-muted-foreground">
                    Fill in the property details and investment information to get AI-powered rental income predictions and ROI analysis.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
