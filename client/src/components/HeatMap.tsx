import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, Target, Map } from "lucide-react";
import { PAKISTANI_CITIES } from "@/lib/constants";

interface HeatmapData {
  city: string;
  areas: Array<{
    name: string;
    lat: number;
    lng: number;
    avgPrice: number;
    growth: number;
  }>;
  lastUpdated: string;
}

export default function HeatMap() {
  const [selectedCity, setSelectedCity] = useState("Karachi");
  const [mapType, setMapType] = useState("Property Values");
  const [propertyType, setPropertyType] = useState("All Property Types");

  const { data: heatmapData, isLoading } = useQuery<HeatmapData>({
    queryKey: ['/api/ml/heatmap-data', selectedCity],
    queryFn: async () => {
      const response = await fetch(`/api/ml/heatmap-data?city=${selectedCity}`);
      if (!response.ok) throw new Error('Failed to fetch heatmap data');
      return response.json();
    },
  });

  const { data: marketInsights } = useQuery({
    queryKey: ['/api/market-insights'],
    queryFn: async () => {
      const response = await fetch('/api/market-insights');
      if (!response.ok) throw new Error('Failed to fetch market insights');
      return response.json();
    },
  });

  return (
    <div className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-primary mb-4">Market Insights & Heatmaps</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Visualize property values, investment opportunities, and market trends across Pakistani cities with our interactive AI-powered heatmaps.
          </p>
        </div>
        
        {/* Controls */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger data-testid="select-heatmap-city">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {PAKISTANI_CITIES.slice(0, 3).map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={mapType} onValueChange={setMapType}>
                <SelectTrigger data-testid="select-map-type">
                  <SelectValue placeholder="Map Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Property Values">Property Values</SelectItem>
                  <SelectItem value="ROI Potential">ROI Potential</SelectItem>
                  <SelectItem value="Growth Trends">Growth Trends</SelectItem>
                  <SelectItem value="Rental Yields">Rental Yields</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger data-testid="select-property-type-heatmap">
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Property Types">All Property Types</SelectItem>
                  <SelectItem value="Houses">Houses</SelectItem>
                  <SelectItem value="Flats">Flats</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
              
              <Button data-testid="button-update-heatmap">
                Update Map
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Interactive Map */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Property Value Heatmap - {selectedCity}</CardTitle>
                <p className="text-muted-foreground">Areas shaded by average property values per marla</p>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-muted rounded-lg relative" data-testid="heatmap-container">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Map className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">Interactive Heatmap</p>
                      <p className="text-sm text-muted-foreground">
                        {isLoading ? "Loading map visualization..." : "Map visualization for " + selectedCity}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Property Value Range (PKR per Marla)</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-200 rounded mr-2"></div>
                      <span className="text-xs text-muted-foreground">10-30 Lac</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-400 rounded mr-2"></div>
                      <span className="text-xs text-muted-foreground">30-50 Lac</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-600 rounded mr-2"></div>
                      <span className="text-xs text-muted-foreground">50-80 Lac</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-800 rounded mr-2"></div>
                      <span className="text-xs text-muted-foreground">80+ Lac</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Market Statistics */}
          <div className="space-y-6">
            {/* Top Areas */}
            <Card>
              <CardHeader>
                <CardTitle>Top Investment Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {heatmapData?.areas.map((area, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-semibold text-primary">{area.name}</div>
                        <div className="text-sm text-muted-foreground">PKR {(area.avgPrice / 100000).toFixed(0)} Lac/Marla</div>
                      </div>
                      <div className="text-right">
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          +{area.growth}%
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">YoY Growth</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Market Insights */}
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              <CardHeader>
                <CardTitle>AI Market Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {marketInsights?.marketPredictions?.map((insight: string, index: number) => (
                    <div key={index} className="flex items-start">
                      {index === 0 && <TrendingUp className="h-4 w-4 mt-0.5 mr-2 text-green-300" />}
                      {index === 1 && <AlertCircle className="h-4 w-4 mt-0.5 mr-2 text-yellow-300" />}
                      {index === 2 && <Target className="h-4 w-4 mt-0.5 mr-2 text-blue-300" />}
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
