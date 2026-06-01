import { useEffect, useRef } from "react";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import { getMapOptions } from "../../utils/googleMapsStyles";

export default function SupplierMap({ supplier }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const mapRef = useRef(null);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !supplier?.latitude || !supplier?.longitude) return;

    const google = window.google;
    const position = { lat: supplier.latitude, lng: supplier.longitude };

    const map = new google.maps.Map(mapRef.current, {
      center: position,
      zoom: 13,
      ...getMapOptions(false),
    });

    const marker = new google.maps.Marker({
      position,
      map,
      title: supplier.companyName || supplier.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: "#6366f1",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2.5,
      },
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="min-width:180px;font-family:system-ui,sans-serif;padding:4px 0;">
          <p style="font-weight:700;font-size:13px;margin:0 0 4px;color:#0f172a">${supplier.companyName || supplier.name}</p>
          ${supplier.address ? `<p style="font-size:11px;color:#64748b;margin:0">${supplier.address}</p>` : ""}
          ${supplier.city || supplier.country ? `<p style="font-size:11px;color:#64748b;margin:2px 0 0">${[supplier.city, supplier.country].filter(Boolean).join(", ")}</p>` : ""}
          ${supplier.email ? `<p style="font-size:11px;color:#4d7aff;margin:4px 0 0">${supplier.email}</p>` : ""}
        </div>
      `,
    });

    marker.addListener("click", () => infoWindow.open(map, marker));
    infoWindow.open(map, marker);

    return () => {
      google.maps.event.clearInstanceListeners(map);
      google.maps.event.clearInstanceListeners(marker);
    };
  }, [isLoaded, supplier]);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <p className="text-sm text-rose-500">Failed to load Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800/50">
        <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full" />;
}
