import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { AreaData } from "@/lib/heatmapUtils";

// Set Mapbox access token
// You can also set this via environment variable: VITE_MAPBOX_ACCESS_TOKEN
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "pk.eyJ1Ijoic3Nrcjc3NyIsImEiOiJjbWl6OHZua3EwbWJoM2dzYzR2NHhjeXAxIn0.5x2IUyx-d49jY4p4VQTnXw";

// Ensure token is set before any map operations
if (typeof mapboxgl !== 'undefined') {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  console.log('Mapbox token set:', MAPBOX_TOKEN.substring(0, 20) + '...');
}

interface ROIHeatmapData {
  city: string;
  areas: AreaData[];
  lastUpdated: string;
}

interface MapboxROIHeatmapProps {
  city: string;
  propertyType: string;
  showMarkers?: boolean;
  showHeatmap?: boolean;
  onError?: () => void;
}

/**
 * Convert area data to GeoJSON format for Mapbox
 */
function convertToGeoJSON(areas: AreaData[]): GeoJSON.FeatureCollection {
  // Calculate min and max prices PER MARLA for normalization (more meaningful for comparison)
  const pricesPerMarla = areas.map(area => area.pricePerMarla || area.avgPrice / 10);
  const minPricePerMarla = Math.min(...pricesPerMarla);
  const maxPricePerMarla = Math.max(...pricesPerMarla);
  const priceRange = maxPricePerMarla - minPricePerMarla || 1; // Avoid division by zero
  
  return {
    type: "FeatureCollection",
    features: areas.map((area) => {
      // Use price per marla for heatmap intensity (more meaningful comparison)
      const pricePerMarla = area.pricePerMarla || area.avgPrice / 10;
      
      // Normalize price per marla to 0-1 scale for heatmap intensity
      // Higher prices per marla = higher intensity (hot red), lower prices = lower intensity (cool colors)
      const priceScore = priceRange > 0 
        ? Math.min(1, Math.max(0, (pricePerMarla - minPricePerMarla) / priceRange))
        : 0.5; // Default to middle if all prices are the same
      
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [area.lng, area.lat], // Mapbox uses [lng, lat]
        },
        properties: {
          name: area.name,
          price_score: priceScore, // Changed from roi_score to price_score
          roi_score: priceScore, // Keep for backward compatibility with existing code
          annualROI: area.annualROI,
          avgPrice: area.avgPrice,
          pricePerMarla: area.pricePerMarla || area.avgPrice / 10,
          monthlyRent: area.monthlyRent,
          propertyAppreciation: area.propertyAppreciation,
          rentGrowth: area.rentGrowth,
          confidence: area.confidence,
          usingHistoricalData: area.usingHistoricalData,
          dataPoints: area.dataPoints,
        },
      };
    }),
  };
}

/**
 * Get price color based on score (0-1) - Higher price = Hotter color
 */
function getPriceColorFromScore(priceScore: number): string {
  if (priceScore >= 0.9) return "#dc2626"; // Red - Very High Price
  if (priceScore >= 0.75) return "#f97316"; // Orange - High Price
  if (priceScore >= 0.5) return "#eab308"; // Yellow - Medium-High Price
  if (priceScore >= 0.25) return "#22c55e"; // Green - Medium-Low Price
  return "#3b82f6"; // Blue - Low Price
}

/**
 * Mapbox GL JS ROI Heatmap Component
 * Displays ML-predicted ROI values as a geographic heatmap using Mapbox
 */
export default function MapboxROIHeatmap({
  city,
  propertyType,
  showMarkers = true,
  showHeatmap = true,
  onError,
}: MapboxROIHeatmapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Fetch heatmap data from API
  const { data: heatmapData, isLoading, error } = useQuery<ROIHeatmapData>({
    queryKey: ['/api/roi/heatmap-data', city, propertyType],
    queryFn: async () => {
      const response = await fetch(`/api/roi/heatmap-data?city=${city}&property_type=${propertyType}`);
      if (!response.ok) throw new Error('Failed to fetch ROI heatmap data');
      return response.json();
    },
  });

  // Initialize Mapbox map
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;
    
    const initMap = () => {
      if (!mapContainer.current) {
        retryCount++;
        if (retryCount < maxRetries) {
          // Retry after a short delay
          setTimeout(initMap, 100);
          return;
        } else {
          console.error('Map container ref not available after retries');
          setMapError("Map container not available. Please refresh the page.");
          if (onError) onError();
          return;
        }
      }
      
      if (map.current) {
        console.log('Map already initialized');
        return;
      }
      
      console.log('Initializing Mapbox map...');

      // Ensure token is set
      if (!mapboxgl.accessToken) {
        mapboxgl.accessToken = MAPBOX_TOKEN;
      }

      // Verify access token is set
      if (!mapboxgl.accessToken || mapboxgl.accessToken === '') {
        console.error('Mapbox token not set');
        setMapError("Mapbox access token is not configured. Please set your Mapbox access token.");
        if (onError) onError();
        return;
      }

      console.log('Initializing Mapbox map with token:', mapboxgl.accessToken.substring(0, 20) + '...');

      try {
      // Calculate center based on city
      const cityCenters: Record<string, [number, number]> = {
        Karachi: [67.0011, 24.8607], // [lng, lat]
        Lahore: [74.3587, 31.5204],
        Islamabad: [73.0479, 33.6844],
        Rawalpindi: [73.0169, 33.5651],
        Faisalabad: [73.1350, 31.4504],
      };

        const center = cityCenters[city] || cityCenters["Karachi"];

        // Create map instance
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: "mapbox://styles/mapbox/dark-v11",
          center: center,
          zoom: 11,
          pitch: 0,
          bearing: 0,
        });

        map.current.on("load", () => {
          console.log('Mapbox map loaded successfully');
          setMapLoaded(true);
          setMapError(null);
        });

        map.current.on("error", (e: any) => {
          console.error("Mapbox error:", e);
          const errorMessage = e.error?.message || e.message || "Unknown error";
          
          if (errorMessage.includes("token") || errorMessage.includes("Token") || errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
            setMapError("Invalid or expired Mapbox access token. Please check your token in the Mapbox dashboard.");
            if (onError) onError(); // Notify parent to switch to Leaflet
          } else if (errorMessage.includes("style")) {
            setMapError("Failed to load map style. Please check your Mapbox access token permissions.");
          } else {
            setMapError(`Mapbox error: ${errorMessage}. Please check your Mapbox access token and try again.`);
          }
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      } catch (error: any) {
        console.error("Error initializing Mapbox:", error);
        const errorMessage = error?.message || "Unknown error";
        
        if (errorMessage.includes("token") || errorMessage.includes("Token") || errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
          setMapError("Invalid or expired Mapbox access token. Please verify your token in Mapbox dashboard.");
          if (onError) onError(); // Notify parent to switch to Leaflet
        } else {
          setMapError(`Failed to initialize map: ${errorMessage}. Please check your Mapbox access token.`);
        }
      }
    };
    
    // Start initialization with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(initMap, 50);
    
    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }
    };
  }, [city, onError]);

  // Add heatmap and circle layers when data is ready
  useEffect(() => {
    if (!map.current || !mapLoaded) {
      console.log('Map not ready:', { hasMap: !!map.current, mapLoaded, hasData: !!heatmapData, showHeatmap });
      return;
    }
    
    if (!heatmapData || !showHeatmap) {
      console.log('Waiting for heatmap data or showHeatmap is false');
      return;
    }
    
    console.log('Adding heatmap layers with', heatmapData.areas.length, 'areas');

    const addHeatmapLayers = () => {
      if (!map.current || !heatmapData) return;

      // Ensure map style is fully loaded before adding sources
      if (!map.current.isStyleLoaded()) {
        // Wait for style to load
        setTimeout(() => addHeatmapLayers(), 100);
        return;
      }

      const geoJSONData = convertToGeoJSON(heatmapData.areas);

      // Add source
      if (map.current.getSource("roi-heatmap-data")) {
        (map.current.getSource("roi-heatmap-data") as mapboxgl.GeoJSONSource).setData(geoJSONData);
      } else {
        try {
          map.current.addSource("roi-heatmap-data", {
            type: "geojson",
            data: geoJSONData,
          });
        } catch (error: any) {
          console.error("Error adding source:", error);
          if (error.message && error.message.includes("not done loading")) {
            // Retry after a short delay
            setTimeout(() => addHeatmapLayers(), 200);
            return;
          }
          // If it's a different error, trigger fallback
          if (onError) onError();
          return;
      }
    }

      // Add heatmap layer
      if (!map.current.getLayer("roi-heatmap")) {
        console.log('Adding heatmap layer with', geoJSONData.features.length, 'points');
        map.current.addLayer({
        id: "roi-heatmap",
        type: "heatmap",
        source: "roi-heatmap-data",
        maxzoom: 20, // Increased from 15 to allow heatmap at higher zoom
        paint: {
          // Increase the heatmap weight based on property price (higher price = higher weight)
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "price_score"],
            0,
            0.3, // Minimum weight for lower prices
            1,
            1, // Maximum weight for higher prices
          ],
          // Increase the heatmap color weight by zoom level - more intense at all zoom levels
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            1.5, // Increased from 1
            9,
            2.5, // Increased from 3
            15,
            3.5, // Added higher zoom intensity
            18,
            4.0, // Maximum intensity at high zoom
          ],
          // Color gradient for heatmap: Higher prices = Hot Red, Lower prices = Cool Blue
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["get", "price_score"],
            0,
            "#3b82f6", // Blue - Low Price (0.0-0.25)
            0.25,
            "#22c55e", // Green - Medium-Low Price (0.25-0.5)
            0.5,
            "#eab308", // Yellow - Medium-High Price (0.5-0.75)
            0.75,
            "#f97316", // Orange - High Price (0.75-0.9)
            0.9,
            "#dc2626", // Red - Very High Price (0.9-1.0)
          ],
          // Significantly increase the heatmap radius by zoom level to cover entire areas
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            30, // Increased from 2 - covers more area at low zoom
            5,
            50, // Covers medium areas
            9,
            80, // Increased from 20 - covers larger areas
            12,
            120, // Covers even larger areas at medium zoom
            15,
            150, // Covers large areas at high zoom
            18,
            200, // Maximum radius at very high zoom - covers entire neighborhoods
          ],
          // Keep heatmap visible at all zoom levels, fade out only at very high zoom
          "heatmap-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.9, // High opacity at low zoom
            9,
            0.95, // Even higher at medium zoom
            15,
            0.9, // Maintain visibility at high zoom
            18,
            0.7, // Slight fade only at very high zoom to show circles
          ],
        },
      });
    }

    // Add circle layer for individual points (visible only at very high zoom)
    if (showMarkers && !map.current.getLayer("roi-points")) {
      map.current.addLayer({
        id: "roi-points",
        type: "circle",
        source: "roi-heatmap-data",
        minzoom: 16, // Increased from 9 - only show circles at very high zoom
        paint: {
          // Size circle by property price (higher price = larger circle)
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "price_score"],
            0,
            6, // Smaller circles for lower prices
            1,
            16, // Larger circles for higher prices
          ],
          // Color circle by property price (higher price = red, lower price = blue)
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "price_score"],
            0,
            "#3b82f6", // Blue - Low Price
            0.25,
            "#22c55e", // Green - Medium-Low Price
            0.5,
            "#eab308", // Yellow - Medium-High Price
            0.75,
            "#f97316", // Orange - High Price
            0.9,
            "#dc2626", // Red - Very High Price
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9, // Increased from 0.8
        },
      });
    }

    // Add hover tooltip
    if (showMarkers) {
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      });

      map.current.on("mouseenter", "roi-points", (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const props = feature.properties;
        if (!props) return;

        // Change cursor style
        map.current!.getCanvas().style.cursor = "pointer";

        // Show popup
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const html = `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 6px;">${props.name}</h3>
            <div style="font-size: 14px; line-height: 1.6;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Property Price (ML):</span>
                <span style="font-weight: 600; color: ${getPriceColorFromScore(props.price_score)};">
                  PKR ${(props.avgPrice / 100000).toFixed(1)} Lac
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Price/Marla:</span>
                <span style="font-weight: 600;">PKR ${(props.pricePerMarla / 100000).toFixed(1)} Lac</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Annual ROI:</span>
                <span style="font-weight: 600;">${props.annualROI.toFixed(1)}%</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>ML Confidence:</span>
                <span style="font-weight: 600;">${(props.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        `;

        popup.setLngLat(coordinates).setHTML(html).addTo(map.current!);
      });

      map.current.on("mouseleave", "roi-points", () => {
        map.current!.getCanvas().style.cursor = "";
        popup.remove();
      });

      // Click to show detailed popup
      map.current.on("click", "roi-points", (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const props = feature.properties;
        if (!props) return;

        const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const detailedHtml = `
          <div style="padding: 10px; min-width: 250px;">
            <h3 style="font-weight: bold; font-size: 18px; margin-bottom: 8px;">${props.name}</h3>
            <div style="font-size: 14px; line-height: 1.8;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Property Price (ML):</span>
                <span style="font-weight: 600; color: ${getPriceColorFromScore(props.price_score)};">
                  PKR ${(props.avgPrice / 100000).toFixed(1)} Lac
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Price/Marla:</span>
                <span style="font-weight: 600;">PKR ${(props.pricePerMarla / 100000).toFixed(1)} Lac</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Annual ROI:</span>
                <span style="font-weight: 600;">${props.annualROI.toFixed(1)}%</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Price/Marla:</span>
                <span style="font-weight: 600;">PKR ${(props.pricePerMarla / 100000).toFixed(1)} Lac</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Monthly Rent:</span>
                <span>PKR ${(props.monthlyRent / 1000).toFixed(0)}K</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Appreciation:</span>
                <span>${props.propertyAppreciation.toFixed(1)}%</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Rent Growth:</span>
                <span>${props.rentGrowth.toFixed(1)}%</span>
              </div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 12px;">Data Source:</span>
                  <span style="font-size: 12px; font-weight: 600;">
                    ${props.usingHistoricalData ? "Historical + ML" : "ML Predicted"}
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 12px;">ML Confidence:</span>
                  <span style="font-size: 12px; font-weight: 600;">${(props.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        `;

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(detailedHtml)
          .addTo(map.current!);
      });
    }

      // Fit bounds to show all points
      if (heatmapData.areas.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        heatmapData.areas.forEach((area) => {
          bounds.extend([area.lng, area.lat]);
        });
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 13,
        });
      }
    };

    // Call the function to add layers
    addHeatmapLayers();
  }, [mapLoaded, heatmapData, showHeatmap, showMarkers, city, propertyType, onError]);

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
          ROI Investment Heatmap - {city} (Mapbox)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          ML-predicted property prices visualized as geographic heatmap using Mapbox GL JS.
          Blue = Lower Prices, Green = Medium Prices, Yellow/Orange = Higher Prices, Red = Highest Prices.
          All values are from trained ML models (same as AI Valuation module).
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mapError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">{mapError}</p>
                  <div className="text-xs space-y-1">
                    <p>
                      <strong>Token Status:</strong> {mapboxgl.accessToken ? `Set (${mapboxgl.accessToken.substring(0, 15)}...)` : "Not configured"}
                    </p>
                    <p>
                      <strong>Possible Issues:</strong>
                    </p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>Token may be expired or invalid</li>
                      <li>Token may not have required permissions (Styles API, Tiles API)</li>
                      <li>Token may have usage limits exceeded</li>
                    </ul>
                    <p>
                      <strong>To Fix:</strong> Verify your token at{" "}
                      <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
                        Mapbox Dashboard
                      </a>
                      {" "}and ensure it has the following scopes:
                    </p>
                    <ul className="list-disc list-inside ml-2">
                      <li>styles:read</li>
                      <li>fonts:read</li>
                      <li>datasets:read</li>
                    </ul>
                    <p className="mt-2 text-muted-foreground">
                      Note: The heatmap data is still available below. You can also use the Leaflet heatmap as an alternative.
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Map Container */}
          <div
            ref={mapContainer}
            className="h-[500px] w-full rounded-lg overflow-hidden border bg-gray-100"
            style={{ 
              minHeight: "500px", 
              position: "relative",
              width: "100%",
              height: "500px"
            }}
          />
          {!mapLoaded && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          )}

          {/* Info Section */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Note:</strong> All property prices are ML-predicted values from the same models used in the AI Valuation module.
              Hover over points to see property prices, click for detailed information.
            </p>
            <p>
              <strong>Color Scheme:</strong> Blue (Lower Prices) → Green (Medium Prices) → Yellow/Orange (Higher Prices) → Red (Highest Prices)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

