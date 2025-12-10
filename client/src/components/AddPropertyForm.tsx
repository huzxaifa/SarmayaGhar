import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Loader2 } from "lucide-react";
import { PAKISTANI_CITIES, PROPERTY_TYPES, BEDROOM_OPTIONS, BATHROOM_OPTIONS } from "@/lib/constants";
import { useLocations } from "@/hooks/useProperties";
import { getAuthToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

const addPropertySchema = z.object({
    city: z.string().min(1, "City is required"),
    location: z.string().min(1, "Location is required"),
    neighbourhood: z.string().optional(),
    propertyType: z.string().min(1, "Property type is required"),
    yearBuilt: z.coerce.number().min(1900, "Year built must be after 1900").optional().or(z.literal("")),
    areaMarla: z.coerce.number().min(0.1, "Area size must be greater than 0"),
    bedrooms: z.coerce.number().min(1, "At least 1 bedroom required"),
    bathrooms: z.coerce.number().min(1, "At least 1 bathroom required"),
    purchasePrice: z.coerce.number().min(1, "Purchase price is required"),
    purchaseDate: z.string().min(1, "Purchase date is required"),
    monthlyRent: z.coerce.number().optional().or(z.literal("")),
    isRented: z.boolean().default(false),
});

type AddPropertyFormData = z.infer<typeof addPropertySchema>;

interface AddPropertyFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function AddPropertyForm({ onSuccess, onCancel }: AddPropertyFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const token = getAuthToken();

    const form = useForm<AddPropertyFormData>({
        resolver: zodResolver(addPropertySchema),
        defaultValues: {
            city: "",
            location: "",
            neighbourhood: "",
            propertyType: "",
            yearBuilt: undefined,
            areaMarla: undefined,
            bedrooms: undefined,
            bathrooms: undefined,
            purchasePrice: undefined,
            purchaseDate: "",
            monthlyRent: undefined,
            isRented: false,
        },
    });

    // Dependent locations based on selected city
    const selectedCity = form.watch("city");
    const { data: locationsData, isLoading: locationsLoading } = useLocations(selectedCity);
    const locationOptions = locationsData?.locations || [];

    // Filtered cities for the dropdown
    const filteredCities = PAKISTANI_CITIES.filter(
        (city) => city !== "Rawalpindi" && city !== "Faisalabad"
    );

    const onSubmit = async (data: AddPropertyFormData) => {
        setIsSubmitting(true);
        setError(null);

        try {
            // First, get current value using ML valuation
            let currentValue = data.purchasePrice; // Default to purchase price if valuation fails

            try {
                const valuationResponse = await fetch("/api/ml/property-valuation", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        city: data.city,
                        location: data.location,
                        propertyType: data.propertyType,
                        areaMarla: data.areaMarla,
                        bedrooms: data.bedrooms,
                        bathrooms: data.bathrooms,
                        yearBuilt: data.yearBuilt || 2020, // Default to 2020 if not provided
                        neighbourhood: data.neighbourhood || undefined,
                    }),
                });

                if (valuationResponse.ok) {
                    const valuationResult = await valuationResponse.json();
                    // The API returns predictedPrice, not estimatedValue
                    if (valuationResult.predictedPrice) {
                        currentValue = parseFloat(valuationResult.predictedPrice);
                    }
                } else {
                    // If valuation fails, log but continue with purchase price
                    const errorText = await valuationResponse.text().catch(() => "Unknown error");
                    console.warn("ML valuation failed:", errorText);
                }
            } catch (valuationError) {
                console.warn("Failed to get ML valuation, using purchase price as current value:", valuationError);
            }

            // Add property to portfolio
            const response = await fetch("/api/portfolio", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    purchasePrice: data.purchasePrice.toString(),
                    purchaseDate: new Date(data.purchaseDate).toISOString(),
                    currentValue: currentValue.toString(),
                    monthlyRent: (data.monthlyRent && data.monthlyRent !== "") ? data.monthlyRent.toString() : null,
                    isRented: data.isRented || false,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Failed to add property" }));
                let errorMessage = errorData.message || "Failed to add property";

                // If there are detailed validation errors, include them
                if (errorData.errors && Array.isArray(errorData.errors)) {
                    const validationErrors = errorData.errors
                        .map((err: any) => `${err.path?.join('.') || 'field'}: ${err.message}`)
                        .join(', ');
                    errorMessage = `${errorMessage}: ${validationErrors}`;
                } else if (errorData.error) {
                    errorMessage = `${errorMessage}: ${errorData.error}`;
                }

                throw new Error(errorMessage);
            }

            // Invalidate portfolio query to refresh the list
            await queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });

            // Reset form
            form.reset();

            // Call success callback
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add property. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Home className="h-5 w-5 text-primary" /> Property Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>City *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select City" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {filteredCities.map((city) => (
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
                                        <FormLabel>Location/Area *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCity || locationsLoading}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={selectedCity ? (locationsLoading ? "Loading..." : "Select Location") : "Select City first"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {locationOptions.map((loc) => (
                                                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                            <FormField
                                control={form.control}
                                name="propertyType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Property Type *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {PROPERTY_TYPES.filter(type => type === "House" || type === "Flat").map((type) => (
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
                                name="neighbourhood"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Neighbourhood</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. Phase 6, Block A"
                                                {...field}
                                                value={field.value ?? ""}
                                                className="placeholder:text-muted-foreground/70"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mt-6">
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
                                                {...field}
                                                value={field.value ?? ""}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    field.onChange(value === "" ? undefined : Number(value));
                                                }}
                                                min="1900"
                                                max={new Date().getFullYear()}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="areaMarla"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Area (Marla) *</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="e.g. 5"
                                                step="0.1"
                                                {...field}
                                                value={field.value ?? ""}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    field.onChange(value === "" ? undefined : Number(value));
                                                }}
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
                                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
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
                                        <FormLabel>Bathrooms *</FormLabel>
                                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
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
                    </CardContent>
                </Card>

                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>Purchase Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="purchasePrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Purchase Price (PKR) *</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="e.g. 50000000"
                                                {...field}
                                                value={field.value ?? ""}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    field.onChange(value === "" ? undefined : Number(value));
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="purchaseDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Purchase Date *</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                {...field}
                                                max={new Date().toISOString().split("T")[0]}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                            <FormField
                                control={form.control}
                                name="monthlyRent"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Monthly Rent (PKR)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="e.g. 50000"
                                                {...field}
                                                value={field.value ?? ""}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    field.onChange(value === "" ? undefined : Number(value));
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="isRented"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col justify-end">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="isRented"
                                                checked={field.value}
                                                onChange={field.onChange}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                            <FormLabel htmlFor="isRented" className="!mt-0 cursor-pointer">
                                                Property is currently rented
                                            </FormLabel>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-4">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding Property...
                            </>
                        ) : (
                            "Add to Portfolio"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
