import { useEffect, useState } from "react";

let loadPromise = null;

function loadGoogleMaps() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";

    window.__googleMapsCallback = () => {
      window.google.maps.importLibrary("places")
        .then(() => window.google.maps.importLibrary("geometry"))
        .then(resolve)
        .catch(reject);
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__googleMapsCallback&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(() => !!window.google?.maps);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }
    let mounted = true;
    loadGoogleMaps()
      .then(() => { if (mounted) setIsLoaded(true); })
      .catch((err) => { if (mounted) setLoadError(err); });
    return () => { mounted = false; };
  }, []);

  return { isLoaded, loadError };
}
