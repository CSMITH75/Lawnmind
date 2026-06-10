/**
 * Approximate ZIP → coordinates without a network geocoder. v1 maps the
 * 3-digit ZIP prefix to a regional centroid for common metros and falls back
 * to first-digit national regions. Accurate enough for climate-zone and
 * weather-grid resolution (~11km cache grid on the server); swap for a real
 * geocoder when GPS onboarding lands.
 */

const PREFIX3: Record<string, [number, number]> = {
  "100": [40.71, -74.01], // NYC
  "021": [42.36, -71.06], // Boston
  "191": [39.95, -75.17], // Philadelphia
  "202": [38.9, -77.04], // DC
  "303": [33.75, -84.39], // Atlanta
  "331": [25.77, -80.19], // Miami
  "372": [36.16, -86.78], // Nashville
  "606": [41.88, -87.63], // Chicago
  "441": [41.5, -81.69], // Cleveland
  "482": [42.33, -83.05], // Detroit
  "495": [42.96, -85.67], // Grand Rapids
  "551": [44.95, -93.09], // St. Paul
  "631": [38.63, -90.2], // St. Louis
  "640": [39.1, -94.58], // Kansas City
  "752": [32.78, -96.8], // Dallas
  "770": [29.76, -95.37], // Houston
  "787": [30.27, -97.74], // Austin
  "802": [39.74, -104.99], // Denver
  "850": [33.45, -112.07], // Phoenix
  "871": [35.08, -106.65], // Albuquerque
  "900": [34.05, -118.24], // LA
  "941": [37.77, -122.42], // SF
  "971": [45.52, -122.68], // Portland
  "981": [47.61, -122.33], // Seattle
};

const FIRST_DIGIT: Record<string, [number, number]> = {
  "0": [42.5, -72.0], // New England
  "1": [41.5, -75.0], // NY/PA
  "2": [37.5, -78.0], // Mid-Atlantic / VA-Carolinas
  "3": [32.5, -84.0], // Southeast
  "4": [40.0, -84.0], // Midwest (OH/IN/MI/KY)
  "5": [44.5, -93.0], // Upper Midwest
  "6": [38.5, -92.0], // Central
  "7": [32.5, -96.5], // South Central
  "8": [39.5, -105.5], // Mountain
  "9": [37.5, -120.0], // West Coast
};

export function coordsForZip(zip: string): { lat: number; lng: number } {
  const three = PREFIX3[zip.slice(0, 3)];
  if (three) return { lat: three[0], lng: three[1] };
  const one = FIRST_DIGIT[zip[0] ?? ""] ?? [39.8, -98.6]; // geographic center of the US
  return { lat: one[0], lng: one[1] };
}

export function zoneLabelForLat(lat: number): string {
  if (lat >= 40) return "Cool-season zone";
  if (lat >= 35) return "Transition zone";
  return "Warm-season zone";
}

export function grassOptionsForLat(lat: number): string[] {
  if (lat >= 40)
    return ["Kentucky Bluegrass", "Tall Fescue", "Perennial Ryegrass", "Fine Fescue", "Not sure"];
  if (lat >= 35) return ["Tall Fescue", "Zoysia", "Kentucky Bluegrass", "Bermuda", "Not sure"];
  return ["Bermuda", "Zoysia", "St. Augustine", "Centipede", "Bahia", "Not sure"];
}
