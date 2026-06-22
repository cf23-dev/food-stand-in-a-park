// Server-side Google Maps helpers (Geocoding, Directions, Distance Matrix).
// These use the GOOGLE_MAPS_SERVER_KEY and run only in route handlers.

import type { LatLng } from "./geo";

const SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

// Turn a street address into coordinates. Uses Google when a key is configured,
// otherwise falls back to OpenStreetMap's free Nominatim service (no key/billing).
export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  // Use Google only when a real key is set (ignore .env.example placeholders).
  if (SERVER_KEY && !SERVER_KEY.startsWith("your-")) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("address", address);
      url.searchParams.set("key", SERVER_KEY);

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.status === "OK" && data.results?.length) {
        const r = data.results[0];
        return {
          latitude: r.geometry.location.lat,
          longitude: r.geometry.location.lng,
          formattedAddress: r.formatted_address,
        };
      }
      // Invalid key, no results, etc. — fall through to the free geocoder.
    } catch {
      /* network error — fall through */
    }
  }
  // No (valid) Google key, or Google failed — use a free, keyless geocoder.
  // Try OpenStreetMap Nominatim first, then Photon as a backup.
  return (await geocodeViaNominatim(address)) ?? (await geocodeViaPhoton(address));
}

// Free, keyless geocoding via OpenStreetMap Nominatim.
// Usage policy: max ~1 request/sec and a descriptive User-Agent.
async function geocodeViaNominatim(
  address: string
): Promise<GeocodeResult | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "FoodStandInAPark/1.0 (community food pickup app)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[geocode] Nominatim HTTP ${res.status} for "${address}"`);
      return null;
    }
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data.length) {
      console.warn(`[geocode] Nominatim found no match for "${address}"`);
      return null;
    }
    return {
      latitude: Number(data[0].lat),
      longitude: Number(data[0].lon),
      formattedAddress: data[0].display_name,
    };
  } catch (err) {
    console.warn(`[geocode] Nominatim request failed:`, err);
    return null;
  }
}

// Backup free geocoder (Photon by Komoot, OSM-based, no key required).
async function geocodeViaPhoton(address: string): Promise<GeocodeResult | null> {
  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", address);
    url.searchParams.set("limit", "1");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[geocode] Photon HTTP ${res.status} for "${address}"`);
      return null;
    }
    const data = (await res.json()) as {
      features?: Array<{ geometry: { coordinates: [number, number] }; properties: Record<string, string> }>;
    };
    const f = data.features?.[0];
    if (!f) {
      console.warn(`[geocode] Photon found no match for "${address}"`);
      return null;
    }
    const [lon, lat] = f.geometry.coordinates; // GeoJSON order: [lon, lat]
    const p = f.properties;
    const formatted = [p.name, p.street, p.city, p.state, p.country].filter(Boolean).join(", ");
    return { latitude: lat, longitude: lon, formattedAddress: formatted || address };
  } catch (err) {
    console.warn(`[geocode] Photon request failed:`, err);
    return null;
  }
}

export interface RouteInfo {
  distanceText: string; // e.g. "4.2 mi"
  distanceMeters: number;
  durationText: string; // e.g. "12 mins"
  durationSeconds: number;
}

// Driving distance + ETA between two points (Distance Matrix API).
export async function getRouteInfo(
  origin: LatLng,
  destination: LatLng
): Promise<RouteInfo | null> {
  if (!SERVER_KEY) return null;
  const url = new URL(
    "https://maps.googleapis.com/maps/api/distancematrix/json"
  );
  url.searchParams.set("origins", `${origin.latitude},${origin.longitude}`);
  url.searchParams.set(
    "destinations",
    `${destination.latitude},${destination.longitude}`
  );
  url.searchParams.set("units", "imperial");
  url.searchParams.set("key", SERVER_KEY);

  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  const el = data.rows?.[0]?.elements?.[0];
  if (!el || el.status !== "OK") return null;

  return {
    distanceText: el.distance.text,
    distanceMeters: el.distance.value,
    durationText: el.duration.text,
    durationSeconds: el.duration.value,
  };
}

// Note: `directionsUrl` lives in lib/geo.ts so it can be used in client bundles
// without pulling in this server-only module.
