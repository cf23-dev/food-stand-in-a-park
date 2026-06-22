"use client";

import { useEffect, useRef, useState } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { publicMapsKey } from "@/lib/geo";

interface Props {
  id?: string;
  defaultValue?: string;
  onSelect: (v: { address: string; latitude: number; longitude: number }) => void;
  placeholder?: string;
  required?: boolean;
}

// Inner field that wires Google Places Autocomplete to a plain text input.
// Falls back to a normal text field if the Places library isn't available.
function AutocompleteField({ id, defaultValue, onSelect, placeholder, required }: Props) {
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue ?? "");

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const ac = new places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry"],
      types: ["address"],
    });
    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const loc = place.geometry?.location;
      if (loc && place.formatted_address) {
        setValue(place.formatted_address);
        onSelect({
          address: place.formatted_address,
          latitude: loc.lat(),
          longitude: loc.lng(),
        });
      }
    });
    return () => listener.remove();
  }, [places, onSelect]);

  return (
    <input
      ref={inputRef}
      id={id}
      name="address"
      className="input"
      placeholder={placeholder ?? "Start typing an address…"}
      autoComplete="off"
      required={required}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

export function AddressAutocomplete(props: Props) {
  const key = publicMapsKey();
  // Without a key, render a plain input so the form still works in dev.
  if (!key) {
    return (
      <input
        id={props.id}
        name="address"
        className="input"
        defaultValue={props.defaultValue}
        placeholder={props.placeholder ?? "Pickup address"}
        required={props.required}
        onChange={(e) => props.onSelect({ address: e.target.value, latitude: 0, longitude: 0 })}
      />
    );
  }
  return (
    <APIProvider apiKey={key} libraries={["places"]}>
      <AutocompleteField {...props} />
    </APIProvider>
  );
}
