import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, AlertCircle, Target, Map, Loader2 } from "lucide-react";
import { PAKISTANI_CITIES } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";

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

declare global {
    interface Window {
        google: typeof google;
    }
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

export default function GoogleMapsHeatMap() {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const circlesRef = useRef<google.maps.Circle[]>([]);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const [mapError, setMapError] = useState<string | null>(null);

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

    // Initialize Google Map
    useEffect(() => {
        if (!mapRef.current || !heatmapData || heatmapData.areas.length === 0) {
            return;
        }

        // Wait for Google Maps to load
        if (!window.google || !window.google.maps) {
            const checkGoogleMaps = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(checkGoogleMaps);
                    initializeMap();
                }
            }, 100);
            return () => clearInterval(checkGoogleMaps);
        }

        initializeMap();

        function initializeMap() {
            if (!mapRef.current || !window.google || !window.google.maps || !heatmapData || heatmapData.areas.length === 0) {
                return;
            }

            try {
                // Calculate center and bounds
                const lats = heatmapData.areas.map(a => a.lat);
                const lngs = heatmapData.areas.map(a => a.lng);
                const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
                const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;

                // Initialize map - using regular Map (no Map ID required, works even with expired key for basic display)
                const mapOptions: google.maps.MapOptions = {
                    center: { lat: centerLat, lng: centerLng },
                    zoom: 12,
                    mapTypeId: 'roadmap',
                    styles: [
                        {
                            featureType: 'poi',
                            elementType: 'labels',
                            stylers: [{ visibility: 'off' }]
                        }
                    ]
                };

                let map: google.maps.Map;
                try {
                    map = new window.google.maps.Map(mapRef.current!, mapOptions);
                    mapInstanceRef.current = map;
                    setMapError(null);
                } catch (error: any) {
                    console.error('Error creating map:', error);
                    if (error.message?.includes('ExpiredKey') || error.message?.includes('InvalidKey') || error.message?.includes('ExpiredKeyMapError')) {
                        setMapError('Google Maps API key is expired or invalid. The heatmap data (powered by ML models) is still available below. Please update the API key in Google Cloud Console.');
                    } else {
                        setMapError('Failed to initialize Google Maps. Please check your API key.');
                    }
                    return;
                }

                // Create InfoWindow
                const infoWindow = new window.google.maps.InfoWindow();
                infoWindowRef.current = infoWindow;

                // Clear existing markers and circles
                markersRef.current.forEach(marker => marker.setMap(null));
                markersRef.current = [];
                circlesRef.current.forEach(circle => circle.setMap(null));
                circlesRef.current = [];

                // Create custom heatmap visualization using circles (visual representation of ROI intensity)
                // All values are from ML models via /api/roi/heatmap-data endpoint
                heatmapData.areas.forEach((area) => {
                    const position = { lat: area.lat, lng: area.lng };

                    // Create circle for heatmap effect (radius based on ROI intensity)
                    const circle = new window.google.maps.Circle({
                        strokeColor: getROIColor(area.annualROI),
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: getROIColor(area.annualROI),
                        fillOpacity: 0.35,
                        map: map,
                        center: position,
                        radius: 800 + (area.annualROI / 30) * 1500, // Radius 800-2300 meters based on ROI
                    });
                    circlesRef.current.push(circle);

                    // Use regular Marker (works without Map ID, compatible with expired keys)
                    const marker = new window.google.maps.Marker({
                        position: position,
                        map: map,
                        title: `${area.name} - ROI: ${area.annualROI.toFixed(1)}% (ML Predicted)`,
                        icon: {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 8 + (area.annualROI / 30) * 12, // Size 8-20 based on ROI
                            fillColor: getROIColor(area.annualROI),
                            fillOpacity: 0.9,
                            strokeColor: '#ffffff',
                            strokeWeight: 2,
                        },
                    });

                    // Add click listener to show info window with ML-predicted data
                    marker.addListener('click', () => {
                        const content = createInfoWindowContent(area);
                        infoWindow.setContent(content);
                        infoWindow.open(map, marker);
                    });

                    markersRef.current.push(marker);
                });

                // Fit bounds to show all markers
                if (heatmapData.areas.length > 0) {
                    const bounds = new window.google.maps.LatLngBounds();
                    heatmapData.areas.forEach(area => {
                        bounds.extend({ lat: area.lat, lng: area.lng });
                    });
                    map.fitBounds(bounds);
                }
            } catch (error: any) {
                console.error('Error initializing map:', error);
                if (error.message?.includes('ExpiredKey') || error.message?.includes('InvalidKey') || error.message?.includes('ExpiredKeyMapError')) {
                    setMapError('Google Maps API key is expired or invalid. The heatmap data (powered by ML models) is still available below. Please update the API key in Google Cloud Console.');
                } else {
                    setMapError('Failed to load Google Maps. Please check your API key and try again.');
                }
            }
        }

        // Cleanup function
        return () => {
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];
            circlesRef.current.forEach(circle => circle.setMap(null));
            circlesRef.current = [];
        };
    }, [heatmapData]);


    // Create info window content
    const createInfoWindowContent = (area: ROIHeatmapData['areas'][0]) => {
        return `
      <div style="padding: 8px; min-width: 250px;">
        <h3 style="font-weight: bold; font-size: 18px; margin-bottom: 8px;">${area.name}</h3>
        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 14px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Annual ROI:</span>
            <span style="font-weight: bold; color: ${getROIColor(area.annualROI)};">${area.annualROI.toFixed(1)}%</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Property Price (ML):</span>
            <span style="font-weight: 600;">PKR ${(area.avgPrice / 100000).toFixed(0)} Lac/Marla</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Monthly Rent:</span>
            <span>PKR ${(area.monthlyRent / 1000).toFixed(0)}K</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Appreciation:</span>
            <span>${area.propertyAppreciation.toFixed(1)}%</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Rent Growth:</span>
            <span>${area.rentGrowth.toFixed(1)}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb;">
            <span>Data Source:</span>
            <span style="font-size: 12px; color: ${area.usingHistoricalData ? '#059669' : '#0284c7'}; font-weight: 600;">
              ${area.usingHistoricalData ? 'Historical + ML' : 'ML Predicted'}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>ML Confidence:</span>
            <span style="font-weight: 600;">${(area.confidence * 100).toFixed(0)}%</span>
          </div>
          ${area.dataPoints > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Data Points:</span>
            <span>${area.dataPoints}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    };

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
                        Visualize investment opportunities and ROI potential across Pakistani cities using Google Maps.
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
                    {/* Google Maps Heatmap */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>ROI Investment Heatmap - {selectedCity}</CardTitle>
                                <p className="text-muted-foreground">
                                    Heatmap visualization powered by Google Maps with ML-predicted property values from trained models.
                                    All prices and ROI calculations use actual ML model predictions. Red = High ROI, Green = Low ROI
                                </p>
                            </CardHeader>
                            <CardContent>
                                {mapError && (
                                    <Alert variant="destructive" className="mb-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{mapError}</AlertDescription>
                                    </Alert>
                                )}
                                <div
                                    ref={mapRef}
                                    className="h-96 rounded-lg overflow-hidden"
                                    data-testid="heatmap-container"
                                    style={{ minHeight: '400px' }}
                                />

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