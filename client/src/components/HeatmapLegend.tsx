import { Card, CardContent } from "@/components/ui/card";

/**
 * Legend component for ROI heatmap
 * Shows color scale and ROI ranges
 */
export default function HeatmapLegend() {
    const roiRanges = [
        { min: 30, max: Infinity, color: '#dc2626', label: '30%+ (Excellent)' },
        { min: 25, max: 30, color: '#ea580c', label: '25-30% (Very Good)' },
        { min: 20, max: 25, color: '#f97316', label: '20-25% (Good)' },
        { min: 15, max: 20, color: '#f59e0b', label: '15-20% (Fair)' },
        { min: 10, max: 15, color: '#eab308', label: '10-15% (Moderate)' },
        { min: 5, max: 10, color: '#84cc16', label: '5-10% (Low)' },
        { min: 0, max: 5, color: '#22c55e', label: 'Below 5% (Very Low)' },
    ];

    return (
        <Card className="mt-4">
            <CardContent className="p-4">
                <div className="space-y-3">
                    <div className="text-sm font-semibold text-primary mb-2">
                        Heatmap Intensity (Price per Marla)
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full flex-shrink-0 bg-red-600" />
                            <span className="text-xs text-muted-foreground">High Price (Red) - Premium Areas</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full flex-shrink-0 bg-orange-500" />
                            <span className="text-xs text-muted-foreground">Medium-High Price (Orange)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full flex-shrink-0 bg-yellow-500" />
                            <span className="text-xs text-muted-foreground">Medium Price (Yellow)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full flex-shrink-0 bg-lime-500" />
                            <span className="text-xs text-muted-foreground">Medium-Low Price (Lime)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full flex-shrink-0 bg-green-500" />
                            <span className="text-xs text-muted-foreground">Low Price (Green) - Affordable Areas</span>
                        </div>
                    </div>
                    <div className="pt-2 border-t text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Note:</p>
                        <p>The heatmap shows ML-predicted property prices per marla. Red areas have higher prices, green areas have lower prices. Click markers to see ROI details.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
