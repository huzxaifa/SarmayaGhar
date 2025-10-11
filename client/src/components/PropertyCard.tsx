import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/constants";
import type { Property } from "@/lib/types";

interface PropertyCardProps {
  property: Property;
  onViewDetails?: (id: string) => void;
}

export default function PropertyCard({ property, onViewDetails }: PropertyCardProps) {
  const getBadgeVariant = (aiScore?: number) => {
    if (!aiScore) return "secondary";
    if (aiScore >= 90) return "default";
    if (aiScore >= 80) return "secondary";
    return "outline";
  };

  const getBadgeText = (aiScore?: number) => {
    if (!aiScore) return "Not Rated";
    if (aiScore >= 90) return "AI Valued";
    if (aiScore >= 80) return "Good Deal";
    return "Fair Deal";
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow" data-testid={`property-card-${property.id}`}>
      {/* Property Image */}
      <div className="relative">
        <img
          src={property.images[0] || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"}
          alt={property.title}
          className="w-full h-48 object-cover"
          data-testid={`property-image-${property.id}`}
        />
        <div className="absolute top-4 right-4">
          <Badge variant={getBadgeVariant(property.aiScore)}>
            {getBadgeText(property.aiScore)}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-xl font-bold text-primary" data-testid={`property-title-${property.id}`}>
              {property.title}
            </h3>
            <p className="text-muted-foreground" data-testid={`property-location-${property.id}`}>
              {property.area}, {property.city}
            </p>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div className="text-2xl font-bold text-primary" data-testid={`property-price-${property.id}`}>
            {formatCurrency(property.price)}
          </div>
          <div className="text-sm text-muted-foreground">
            {property.areaUnit === "marla" 
              ? `${formatCurrency(parseFloat(property.price) / parseFloat(property.areaSize))}/Marla`
              : `PKR ${Math.round(parseFloat(property.price) / parseFloat(property.areaSize))}/sq ft`
            }
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-primary" data-testid={`property-bedrooms-${property.id}`}>
              {property.bedrooms}
            </div>
            <div className="text-xs text-muted-foreground">Bedrooms</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-primary" data-testid={`property-bathrooms-${property.id}`}>
              {property.bathrooms}
            </div>
            <div className="text-xs text-muted-foreground">Bathrooms</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-primary" data-testid={`property-area-${property.id}`}>
              {property.areaSize}
            </div>
            <div className="text-xs text-muted-foreground">{property.areaUnit}</div>
          </div>
        </div>
        
        {/* AI Insights */}
        {(property.aiScore || property.expectedROI || property.rentalYield) && (
          <div className="bg-accent/10 rounded-lg p-3 mb-4">
            {property.aiScore && (
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">AI Valuation Score:</span>
                <span className="font-semibold text-primary" data-testid={`property-ai-score-${property.id}`}>
                  {property.aiScore}/100
                </span>
              </div>
            )}
            {property.expectedROI && (
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Expected ROI:</span>
                <span className="font-semibold text-green-600" data-testid={`property-roi-${property.id}`}>
                  +{property.expectedROI}% annually
                </span>
              </div>
            )}
            {property.rentalYield && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rental Yield:</span>
                <span className="font-semibold text-green-600" data-testid={`property-yield-${property.id}`}>
                  {property.rentalYield}% annually
                </span>
              </div>
            )}
          </div>
        )}
        
        <Button 
          className="w-full" 
          onClick={() => onViewDetails?.(property.id)}
          data-testid={`button-view-details-${property.id}`}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
