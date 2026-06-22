"use client";

import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { useState } from "react";
import type { PickupWithDetails, FoodBank } from "@/lib/types";
import { publicMapsKey } from "@/lib/geo";

interface Props {
  pickups: PickupWithDetails[];
  foodBanks?: FoodBank[];
  volunteer?: { latitude: number; longitude: number } | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

const DEFAULT_CENTER = { lat: 47.6062, lng: -122.3321 }; // Seattle

// Interactive map of pickups (green), food banks (amber), volunteer (blue dot).
export function PickupMap({ pickups, foodBanks = [], volunteer, selectedId, onSelect }: Props) {
  const key = publicMapsKey();
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  const [open, setOpen] = useState<string | null>(null);

  if (!key) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
        Set <code className="mx-1 rounded bg-gray-200 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
        to display the interactive map.
      </div>
    );
  }

  const center =
    volunteer ?? (pickups[0] ? { lat: pickups[0].latitude, lng: pickups[0].longitude } : DEFAULT_CENTER);

  return (
    <APIProvider apiKey={key}>
      <div className="h-full min-h-80 overflow-hidden rounded-xl border border-gray-200">
        <Map
          defaultCenter={"lat" in center ? center : { lat: center.latitude, lng: center.longitude }}
          defaultZoom={11}
          mapId={mapId}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: "100%", height: "100%", minHeight: "20rem" }}
        >
          {volunteer && (
            <AdvancedMarker position={{ lat: volunteer.latitude, lng: volunteer.longitude }} title="You">
              <Pin background="#2563eb" borderColor="#1e40af" glyphColor="#fff" />
            </AdvancedMarker>
          )}

          {pickups.map((p) => (
            <AdvancedMarker
              key={p.id}
              position={{ lat: p.latitude, lng: p.longitude }}
              onClick={() => {
                setOpen(p.id);
                onSelect?.(p.id);
              }}
            >
              <Pin
                background={selectedId === p.id ? "#15803d" : "#22c55e"}
                borderColor="#166534"
                glyphColor="#fff"
              />
            </AdvancedMarker>
          ))}

          {foodBanks.map((fb) => (
            <AdvancedMarker key={fb.id} position={{ lat: fb.latitude, lng: fb.longitude }} title={fb.name}>
              <Pin background="#f59e0b" borderColor="#b45309" glyphColor="#fff" />
            </AdvancedMarker>
          ))}

          {open &&
            (() => {
              const p = pickups.find((x) => x.id === open);
              if (!p) return null;
              return (
                <InfoWindow position={{ lat: p.latitude, lng: p.longitude }} onCloseClick={() => setOpen(null)}>
                  <div className="max-w-52 text-sm">
                    <p className="font-semibold">{p.food_type}</p>
                    <p className="text-gray-600">{p.address}</p>
                    {p.quantity && <p className="mt-1 text-gray-500">{p.quantity}</p>}
                  </div>
                </InfoWindow>
              );
            })()}
        </Map>
      </div>
    </APIProvider>
  );
}
