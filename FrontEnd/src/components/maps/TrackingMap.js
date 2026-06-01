import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import { getMapOptions } from "../../utils/googleMapsStyles";

const BRAND_BLUE = "#4d7aff";
const EMERALD = "#22C55E";
const PURPLE = "#6366f1";

export default function TrackingMap({ order, supplier, livePosition, connected }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const truckMarkerRef = useRef(null);
  const rendererRef = useRef(null);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const google = window.google;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 48.85, lng: 2.35 },
      zoom: 3,
      ...getMapOptions(false),
    });
    googleMapRef.current = map;

    // Supplier origin marker
    if (supplier?.latitude && supplier?.longitude) {
      const supplierPos = { lat: supplier.latitude, lng: supplier.longitude };
      new google.maps.Marker({
        position: supplierPos,
        map,
        title: supplier.companyName || supplier.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: PURPLE,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });

      new google.maps.InfoWindow({
        content: `<div style="font-family:system-ui;font-size:12px;font-weight:700;color:#0f172a">${supplier.companyName || supplier.name}<br/><span style="font-weight:400;color:#64748b">Origin</span></div>`,
      });

      map.panTo(supplierPos);
      map.setZoom(5);

      // Calculate route if we have tracking data
      const tracking = order?.tracking;
      if (tracking?.destinationLatitude && tracking?.destinationLongitude) {
        const dest = { lat: tracking.destinationLatitude, lng: tracking.destinationLongitude };
        const directionsService = new google.maps.DirectionsService();
        const renderer = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: { strokeColor: BRAND_BLUE, strokeWeight: 3, strokeOpacity: 0.85 },
        });
        renderer.setMap(map);
        rendererRef.current = renderer;

        directionsService.route(
          {
            origin: supplierPos,
            destination: dest,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === "OK") {
              renderer.setDirections(result);
              const leg = result.routes[0]?.legs[0];
              if (leg) setRouteInfo({ distance: leg.distance.text, duration: leg.duration.text });
            }
          }
        );

        // Destination marker
        new google.maps.Marker({
          position: dest,
          map,
          title: "Destination",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: EMERALD,
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });
      }
    }

    // Truck marker (live position)
    const truckMarker = new google.maps.Marker({
      position: supplier?.latitude
        ? { lat: supplier.latitude, lng: supplier.longitude }
        : { lat: 48.85, lng: 2.35 },
      map,
      title: "Delivery",
      icon: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${BRAND_BLUE}">
            <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/>
            <circle cx="5.5" cy="18.5" r="2.5" fill="white" stroke="${BRAND_BLUE}" stroke-width="1.5"/>
            <circle cx="18.5" cy="18.5" r="2.5" fill="white" stroke="${BRAND_BLUE}" stroke-width="1.5"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16),
      },
    });
    truckMarkerRef.current = truckMarker;

    return () => {
      google.maps.event.clearInstanceListeners(map);
    };
  }, [isLoaded, supplier, order]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate truck marker when livePosition updates
  useEffect(() => {
    if (!truckMarkerRef.current || !livePosition) return;
    const google = window.google;
    const pos = new google.maps.LatLng(livePosition.lat, livePosition.lng);
    truckMarkerRef.current.setPosition(pos);
    if (googleMapRef.current) googleMapRef.current.panTo(pos);
  }, [livePosition]);

  if (loadError) {
    return (
      <div className="w-full h-80 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl">
        <p className="text-sm text-rose-500">Failed to load Google Maps</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
          <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-80 rounded-2xl overflow-hidden" />

      {/* Route info overlay */}
      {routeInfo && (
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <div className="rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200/60 dark:border-white/[0.08]">
            📍 {routeInfo.distance}
          </div>
          <div className="rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200/60 dark:border-white/[0.08]">
            ⏱ {routeInfo.duration}
          </div>
        </div>
      )}

      {/* Live connection badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm border ${
          connected
            ? "bg-emerald-50/90 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
            : "bg-slate-50/90 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.08]"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
          {connected ? "Live" : "Static"}
        </div>
      </div>

      {/* Live position info */}
      {livePosition && (
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <div className="rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-4 py-2 text-xs text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200/60 dark:border-white/[0.08] flex items-center justify-between">
            <span className="font-semibold">{livePosition.status || "In Transit"}</span>
            {livePosition.estimatedArrival && (
              <span>ETA: <strong>{new Date(livePosition.estimatedArrival).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
