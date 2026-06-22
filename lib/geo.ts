// Geo helpers usable on both client and server (no external deps).

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_MILES = 3958.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Great-circle (haversine) distance in miles.
export function distanceMiles(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_MILES * 2 * Math.asin(Math.sqrt(h));
}

export function formatMiles(miles: number): string {
  if (miles < 0.1) return "<0.1 mi";
  return `${miles.toFixed(1)} mi`;
}

// The public Google Maps key, or undefined if unset or still a placeholder
// (the .env.example values start with "your-"). Prevents InvalidKeyMapError
// from leftover template text.
export function publicMapsKey(): string | undefined {
  const k = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return k && !k.startsWith("your-") ? k : undefined;
}

// Build a shareable Google Maps directions URL (origin → destination).
export function directionsUrl(origin: LatLng, dest: LatLng): string {
  return (
    "https://www.google.com/maps/dir/?api=1" +
    `&origin=${origin.latitude},${origin.longitude}` +
    `&destination=${dest.latitude},${dest.longitude}` +
    "&travelmode=driving"
  );
}

// Find the nearest item with lat/lng to a reference point.
export function nearest<T extends LatLng>(
  point: LatLng,
  items: T[]
): { item: T; miles: number } | null {
  if (items.length === 0) return null;
  let best = items[0];
  let bestMiles = distanceMiles(point, best);
  for (const item of items.slice(1)) {
    const d = distanceMiles(point, item);
    if (d < bestMiles) {
      best = item;
      bestMiles = d;
    }
  }
  return { item: best, miles: bestMiles };
}
