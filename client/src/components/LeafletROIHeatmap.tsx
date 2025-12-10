import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// @ts-ignore - leaflet.heat extends Leaflet but doesn't have TypeScript definitions
// Import after Leaflet to ensure L is available
import "leaflet.heat/dist/leaflet-heat.js";
import type { LatLngExpression } from "leaflet";
import {
  transformToHeatmapData,
  calculateMapBounds,
  getROIColor,
  formatROI,
  type AreaData,
} from "@/lib/heatmapUtils";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ROIHeatmapData {
  city: string;
  areas: AreaData[];
  lastUpdated: string;
}

interface LeafletROIHeatmapProps {
  city: string;
  propertyType: string;
  showMarkers?: boolean;
  showHeatmap?: boolean;
}

/**
 * HeatLayer component that adds the heatmap overlay
 */
function HeatLayer({ data }: { data: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Create heat layer using leaflet.heat
    // Increased radius and opacity to make heat spots more visible
    const heatLayer = (L as any).heatLayer(data, {
      radius: 50,        // Increased from 25 to make spots more visible
      blur: 25,          // Increased from 15 for smoother blending
      maxZoom: 18,
      minOpacity: 0.4,   // Increased from 0.3
      maxOpacity: 0.9,   // Increased from 0.8
      gradient: {
        0.0: '#22c55e',  // Green - Low price per marla
        0.25: '#84cc16', // Lime
        0.5: '#eab308',  // Yellow
        0.75: '#f97316', // Orange
        1.0: '#dc2626'   // Red - High price per marla
      }
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [data, map]);

  return null;
}

/**
 * Main Leaflet ROI Heatmap Component
 * Displays ML-predicted ROI values as a geographic heatmap
 */
export default function LeafletROIHeatmap({
  city,
  propertyType,
  showMarkers = true,
  showHeatmap = true,
}: LeafletROIHeatmapProps) {
  const [mapReady, setMapReady] = useState(false);

  // Fetch heatmap data from API
  const { data: heatmapData, isLoading, error } = useQuery<ROIHeatmapData>({
    queryKey: ['/api/roi/heatmap-data', city, propertyType],
    queryFn: async () => {
      const response = await fetch(`/api/roi/heatmap-data?city=${city}&property_type=${propertyType}`);
      if (!response.ok) throw new Error('Failed to fetch ROI heatmap data');
      return response.json();
    },
  });

  // Transform data for heatmap - using price per marla for intensity
  const heatmapPoints = heatmapData
    ? transformToHeatmapData(heatmapData.areas, true) // true = use price per marla
    : [];

  // Calculate map bounds
  const mapBounds = heatmapData
    ? calculateMapBounds(heatmapData.areas)
    : { center: [24.8607, 67.0011] as [number, number], bounds: null };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading ML-predicted heatmap data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load heatmap data. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!heatmapData || heatmapData.areas.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No heatmap data available for {city}. Please select a different city.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Property Price Heatmap - {city}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          ML-predicted property prices per marla visualized as geographic heatmap. Red = High price per marla, Green = Low price per marla.
          All values are calculated from trained ML models. Click markers for detailed ROI information.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Map Container */}
          <div className="h-96 w-full rounded-lg overflow-hidden border" style={{ minHeight: '400px' }}>
            <MapContainer
              center={mapBounds.center as LatLngExpression}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Heatmap Layer */}
              {showHeatmap && <HeatLayer data={heatmapPoints} />}

              {/* Markers with Popups */}
              {showMarkers && heatmapData.areas.map((area, index) => (
                <Marker
                  key={index}
                  position={[area.lat, area.lng] as LatLngExpression}
                  icon={L.icon({
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                  })}
                >
                  <Popup>
                    <div className="p-2 min-w-[250px]">
                      <h3 className="font-bold text-lg mb-2">{area.name}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Annual ROI:</span>
                          <Badge
                            style={{ backgroundColor: getROIColor(area.annualROI) }}
                            className="text-white"
                          >
                            {formatROI(area.annualROI)}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Property Price (ML):</span>
                          <span className="font-semibold">
                            PKR {(area.avgPrice / 100000).toFixed(0)} Lac
                          </span>
                        </div>
                        {area.pricePerMarla && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price/Marla:</span>
                            <span className="font-semibold" style={{ color: getROIColor(area.pricePerMarla / 10000) }}>
                              PKR {(area.pricePerMarla / 100000).toFixed(1)} Lac
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monthly Rent:</span>
                          <span>PKR {(area.monthlyRent / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Appreciation:</span>
                          <span>{area.propertyAppreciation.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rent Growth:</span>
                          <span>{area.rentGrowth.toFixed(1)}%</span>
                        </div>
                        <div className="pt-2 mt-2 border-t flex justify-between items-center">
                          <span className="text-muted-foreground text-xs">Data Source:</span>
                          <Badge
                            variant={area.usingHistoricalData ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {area.usingHistoricalData ? "Historical + ML" : "ML Predicted"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">ML Confidence:</span>
                          <span className="text-xs font-medium">
                            {(area.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        {area.dataPoints > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Data Points:</span>
                            <span className="text-xs">{area.dataPoints}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Info Section */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Note:</strong> All property prices and ROI calculations are powered by ML models
              trained on historical property data. Higher ROI values (red) indicate better investment potential.
            </p>
            <p>
              Click on markers to view detailed ML prediction information for each area.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

