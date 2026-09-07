import { useEffect, useState } from "react";

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

declare global {
  interface Window {
    google?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

let loadPromise: Promise<void> | null = null;

// Google Maps JS API'sinin resmi tipleri (@types/google.maps) bu projeye
// eklenmedi; harita nesneleriyle `any` üzerinden çalışılıyor. Script bir kez
// yüklenip tüm bileşenler arasında paylaşılır (aynı anahtarla ikinci kez
// enjekte edilirse Google konsola uyarı basıyor).
export function loadGoogleMaps(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error("Google Maps API anahtarı tanımlı değil."));
      return;
    }
    if (window.google?.maps) {
      resolve();
      return;
    }

    const callbackName = "__ubercekiciGoogleMapsLoaded";
    (window as any)[callbackName] = () => resolve(); // eslint-disable-line @typescript-eslint/no-explicit-any

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=tr&region=TR&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Haritalar yüklenemedi."));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(!!window.google?.maps);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loaded) return;
    loadGoogleMaps()
      .then(() => setLoaded(true))
      .catch((err) => setError((err as Error).message));
  }, [loaded]);

  return { loaded, error };
}
