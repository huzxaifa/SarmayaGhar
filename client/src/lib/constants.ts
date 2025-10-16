export const PAKISTANI_CITIES = [
  "Karachi",
  "Lahore", 
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  // Removed cities without dataset coverage: Multan, Peshawar, Quetta
];

export const PROPERTY_TYPES = [
  "House",
  "Flat",
  "Upper Portion",
  "Lower Portion",
  "Room",
  "Penthouse",
  "Farm House"
];

export const PURPOSE_OPTIONS = [
  "For Sale",
  "For Rent"
];

export const PROPERTY_FEATURES = [
  "Parking",
  "Garden",
  "Security",
  "Generator",
  "Elevator",
  "Pool",
  "Gym",
  "Community Center",
  "Mosque",
  "Shopping Center"
];

export const AREA_UNITS = [
  "marla",
  "kanal",
  "sq ft",
  "sq yard"
];

export const BEDROOM_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
export const BATHROOM_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export const PREDICTION_TIMELINES = [
  { value: "current", label: "Current Value" },
  { value: "1year", label: "1 Year Prediction" },
  { value: "3years", label: "3 Years Prediction" }
];

export const CURRENCY_FORMATTER = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (num >= 10000000) {
    return `PKR ${(num / 10000000).toFixed(1)} Cr`;
  } else if (num >= 100000) {
    return `PKR ${(num / 100000).toFixed(1)} Lac`;
  }
  return CURRENCY_FORMATTER.format(num);
};