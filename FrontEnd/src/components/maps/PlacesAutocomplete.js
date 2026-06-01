import { useEffect, useRef } from "react";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";

export default function PlacesAutocomplete({ value, onChange, onPlaceSelected, placeholder = "Search address...", className = "" }) {
  const { isLoaded } = useGoogleMaps();
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    const google = window.google;
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "address_components", "name"],
    });
    autocompleteRef.current = autocomplete;

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;

      let city = "";
      let country = "";
      for (const comp of place.address_components || []) {
        if (comp.types.includes("locality")) city = comp.long_name;
        if (comp.types.includes("country")) country = comp.long_name;
      }

      const result = {
        address: place.formatted_address || place.name || "",
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        city,
        country,
      };

      if (onChange) onChange(result.address);
      if (onPlaceSelected) onPlaceSelected(result);
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      className={className || "premium-input"}
      autoComplete="off"
    />
  );
}
