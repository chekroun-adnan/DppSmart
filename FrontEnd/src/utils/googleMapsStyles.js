export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0B1120" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0B1120" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94A3B8" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#CBD5E1" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#64748B" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0F172A" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1E293B" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0F172A" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#64748B" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1E293B" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#94A3B8" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#0F172A" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#64748B" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#0B1120" }] },
];

export function getMapOptions(isDark) {
  return {
    mapTypeId: "roadmap",
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    styles: isDark ? DARK_MAP_STYLE : [],
  };
}

export function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}
