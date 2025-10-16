import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, Target, Map, Loader2 } from "lucide-react";
import { PAKISTANI_CITIES } from "@/lib/constants";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ROIHeatmapData {
  city: string;
  areas: Array<{
    name: string;
    lat: number;
    lng: number;
    avgPrice: number;
    monthlyRent: number;
    annualROI: number;
    propertyAppreciation: number;
    rentGrowth: number;
    dataPoints: number;
    confidence: number;
    usingHistoricalData: boolean;
  }>;
  lastUpdated: string;
}

interface MapBoundsProps {
  areas: ROIHeatmapData['areas'];
}

function MapBounds({ areas }: MapBoundsProps) {
  const map = useMap();
  
  useEffect(() => {
    if (areas.length > 0) {
      const bounds = L.latLngBounds(areas.map(area => [area.lat, area.lng]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [areas, map]);
  
  return null;
}

function getROIColor(roi: number): string {
  if (roi >= 30) return "#dc2626"; // Red - High ROI
  if (roi >= 25) return "#ea580c"; // Orange-red
  if (roi >= 20) return "#f97316"; // Orange
  if (roi >= 15) return "#f59e0b"; // Amber
  if (roi >= 10) return "#eab308"; // Yellow
  if (roi >= 5) return "#84cc16"; // Lime
  return "#22c55e"; // Green - Low ROI
}

function getROISize(roi: number): number {
  // Base size + scaling based on ROI
  return Math.max(8, Math.min(20, 8 + (roi / 30) * 12));
}

export default function HeatMap() {
  const [selectedCity, setSelectedCity] = useState("Karachi");
  const [mapType, setMapType] = useState("ROI Analysis");
  const [propertyType, setPropertyType] = useState("House");

  const { data: heatmapData, isLoading } = useQuery<ROIHeatmapData>({
    queryKey: ['/api/roi/heatmap-data', selectedCity, propertyType],
    queryFn: async () => {
      const response = await fetch(`/api/roi/heatmap-data?city=${selectedCity}&property_type=${propertyType}`);
      if (!response.ok) throw new Error('Failed to fetch ROI heatmap data');
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

  if (isLoading) {
    return (
      <div className="py-20 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary mb-4">Market Insights & ROI Heatmaps</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Visualize investment opportunities and ROI potential across Pakistani cities.
            </p>
          </div>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-primary mb-4">Market Insights & ROI Heatmaps</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Visualize investment opportunities and ROI potential across Pakistani cities. 
            Red areas indicate higher ROI potential, green areas show lower ROI.
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
                  <SelectItem value="ROI Analysis">ROI Analysis</SelectItem>
                  <SelectItem value="Property Values">Property Values</SelectItem>
                  <SelectItem value="Rental Yields">Rental Yields</SelectItem>
                  <SelectItem value="Growth Trends">Growth Trends</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger data-testid="select-property-type-heatmap">
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="House">House</SelectItem>
                  <SelectItem value="Flat">Flat</SelectItem>
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
                <CardTitle>ROI Investment Heatmap - {selectedCity}</CardTitle>
                <p className="text-muted-foreground">
                  Areas colored by ROI potential. Red = High ROI, Green = Low ROI
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-96 rounded-lg overflow-hidden" data-testid="heatmap-container">
                  {heatmapData && heatmapData.areas.length > 0 ? (
                    <MapContainer
                      center={[heatmapData.areas[0].lat, heatmapData.areas[0].lng]}
                      zoom={11}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <MapBounds areas={heatmapData.areas} />
                      
                      {heatmapData.areas.map((area, index) => (
                        <CircleMarker
                          key={index}
                          center={[area.lat, area.lng]}
                          radius={getROISize(area.annualROI)}
                          pathOptions={{
                            color: getROIColor(area.annualROI),
                            fillColor: getROIColor(area.annualROI),
                            fillOpacity: 0.7,
                            weight: 2,
                          }}
                        >
                          <Popup>
                            <div className="p-2 min-w-[250px]">
                              <h3 className="font-bold text-lg mb-2">{area.name}</h3>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span>Annual ROI:</span>
                                  <Badge 
                                    variant={area.annualROI >= 25 ? "destructive" : area.annualROI >= 15 ? "default" : "secondary"}
                                  >
                                    {area.annualROI.toFixed(1)}%
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span>Property Price:</span>
                                  <span>PKR {(area.avgPrice / 100000).toFixed(0)} Lac/Marla</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Monthly Rent:</span>
                                  <span>PKR {(area.monthlyRent / 1000).toFixed(0)}K</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Appreciation:</span>
                                  <span>{area.propertyAppreciation.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Rent Growth:</span>
                                  <span>{area.rentGrowth.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Data Source:</span>
                                  <Badge variant={area.usingHistoricalData ? "default" : "outline"}>
                                    {area.usingHistoricalData ? "Historical" : "AI Predicted"}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span>Confidence:</span>
                                  <span>{(area.confidence * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      ))}
                    </MapContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-muted rounded-lg">
                      <div className="text-center">
                        <Map className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">No ROI data available</p>
                        <p className="text-sm text-muted-foreground">
                          Try selecting a different city or property type
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Legend */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">ROI Range (Annual Return)</span>
                  </div>
                  <div className="flex items-center space-x-4 flex-wrap">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-600 rounded-full mr-2"></div>
                      <span className="text-xs text-muted-foreground">30%+ (Excellent)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
                      <span className="text-xs text-muted-foreground">25-30% (Very Good)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                      <span className="text-xs text-muted-foreground">20-25% (Good)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-lime-500 rounded-full mr-2"></div>
                      <span className="text-xs text-muted-foreground">15-20% (Fair)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-xs text-muted-foreground">Below 15% (Low)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Market Statistics */}
          <div className="space-y-6">
            {/* Top ROI Areas */}
            <Card>
              <CardHeader>
                <CardTitle>Top ROI Investment Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {heatmapData?.areas
                    .sort((a, b) => b.annualROI - a.annualROI)
                    .slice(0, 5)
                    .map((area, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-semibold text-primary">{area.name}</div>
                        <div className="text-sm text-muted-foreground">
                          PKR {(area.avgPrice / 100000).toFixed(0)} Lac/Marla
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={area.annualROI >= 25 ? "destructive" : area.annualROI >= 15 ? "default" : "secondary"}
                        >
                          {area.annualROI.toFixed(1)}%
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">Annual ROI</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Investment Insights */}
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              <CardHeader>
                <CardTitle>AI Investment Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start">
                    <TrendingUp className="h-4 w-4 mt-0.5 mr-2 text-green-300" />
                    <span>Best ROI areas show 25%+ annual returns</span>
                  </div>
                  <div className="flex items-start">
                    <Target className="h-4 w-4 mt-0.5 mr-2 text-blue-300" />
                    <span>Historical data provides higher confidence</span>
                  </div>
                  <div className="flex items-start">
                    <AlertCircle className="h-4 w-4 mt-0.5 mr-2 text-yellow-300" />
                    <span>Consider both appreciation and rental income</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
