import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import { getMapOptions } from "../../utils/googleMapsStyles";

export default function MapPicker({ lat, lng, onLocationChange }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);
  const [coords, setCoords] = useState({ lat: lat || 48.85, lng: lng || 2.35 });

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const google = window.google;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: coords.lat, lng: coords.lng },
      zoom: 8,
      ...getMapOptions(false),
    });
    googleMapRef.current = map;

    const marker = new google.maps.Marker({
      position: { lat: coords.lat, lng: coords.lng },
      map,
      draggable: true,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#10b981",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      },
    });
    markerRef.current = marker;

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      const newCoords = { lat: pos.lat(), lng: pos.lng() };
      setCoords(newCoords);
      onLocationChange(newCoords);
    });

    map.addListener("click", (e) => {
      const newCoords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      marker.setPosition(e.latLng);
      setCoords(newCoords);
      onLocationChange(newCoords);
    });

    if (inputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current);
      autocompleteRef.current = autocomplete;
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) return;
        const newCoords = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        map.panTo(newCoords);
        map.setZoom(14);
        marker.setPosition(newCoords);
        setCoords(newCoords);
        onLocationChange(newCoords);
      });
    }

    return () => {
      google.maps.event.clearInstanceListeners(map);
      google.maps.event.clearInstanceListeners(marker);
    };
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
        <p className="text-sm text-rose-500">Failed to load Google Maps</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-white/[0.06]">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search for an address..."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-400 transition"
        />
      </div>
      {!isLoaded ? (
        <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-800/50">
          <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div ref={mapRef} className="flex-1 w-full min-h-[320px]" />
      )}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-white/[0.06] flex gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span>Lat: <strong className="text-slate-900 dark:text-slate-100">{coords.lat.toFixed(6)}</strong></span>
        <span>Lng: <strong className="text-slate-900 dark:text-slate-100">{coords.lng.toFixed(6)}</strong></span>
      </div>
    </div>
  );
}
