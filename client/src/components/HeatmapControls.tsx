import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PAKISTANI_CITIES } from "@/lib/constants";

interface HeatmapControlsProps {
    selectedCity: string;
    propertyType: string;
    mapType: string;
    onCityChange: (city: string) => void;
    onPropertyTypeChange: (type: string) => void;
    onMapTypeChange: (type: string) => void;
    onUpdate?: () => void;
}

/**
 * Controls component for heatmap filters
 */
export default function HeatmapControls({
    selectedCity,
    propertyType,
    mapType,
    onCityChange,
    onPropertyTypeChange,
    onMapTypeChange,
    onUpdate,
}: HeatmapControlsProps) {
    // Filter cities to only show supported ones (Karachi, Lahore, Islamabad)
    const availableCities = PAKISTANI_CITIES.filter(city =>
        city === "Karachi" || city === "Lahore" || city === "Islamabad"
    );

    return (
        <Card className="mb-6">
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select value={selectedCity} onValueChange={onCityChange}>
                        <SelectTrigger data-testid="select-heatmap-city">
                            <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableCities.map((city) => (
                                <SelectItem key={city} value={city}>
                                    {city}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={mapType} onValueChange={onMapTypeChange}>
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

                    <Select value={propertyType} onValueChange={onPropertyTypeChange}>
                        <SelectTrigger data-testid="select-property-type-heatmap">
                            <SelectValue placeholder="Property Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="House">House</SelectItem>
                            <SelectItem value="Flat">Flat</SelectItem>
                        </SelectContent>
                    </Select>

                    {onUpdate && (
                        <Button onClick={onUpdate} data-testid="button-update-heatmap">
                            Update Map
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
