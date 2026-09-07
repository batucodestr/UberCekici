import { useEffect, useRef } from "react";

import { useGoogleMaps } from "@/lib/googleMaps";

interface LatLng {
  lat: number;
  lng: number;
}

interface TrackingMapProps {
  pickup: LatLng;
  dropoff: LatLng;
  driverLocation: LatLng | null;
}

export function TrackingMap({ pickup, dropoff, driverLocation }: TrackingMapProps) {
  const { loaded, error } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const driverMarkerRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstanceRef.current) return;
    const google = window.google;
    const map = new google.maps.Map(mapRef.current, {
      center: pickup,
      zoom: 13,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      scrollwheel: false,
    });
    mapInstanceRef.current = map;

    new google.maps.Marker({ map, position: pickup, label: { text: "B", color: "#fff", fontWeight: "bold" } });
    new google.maps.Marker({ map, position: dropoff, label: { text: "V", color: "#fff", fontWeight: "bold" } });

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(pickup);
    bounds.extend(dropoff);
    map.fitBounds(bounds, 48);
  }, [loaded, pickup, dropoff]);

  useEffect(() => {
    if (!loaded || !mapInstanceRef.current) return;
    const google = window.google;
    const map = mapInstanceRef.current;

    if (!driverLocation) {
      driverMarkerRef.current?.setMap(null);
      driverMarkerRef.current = null;
      return;
    }

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new google.maps.Marker({
        map,
        position: driverLocation,
        label: { text: "🚚", fontSize: "20px" },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
      });
    } else {
      driverMarkerRef.current.setPosition(driverLocation);
    }
  }, [loaded, driverLocation]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      {error && <div className="p-4 text-sm text-red-600">Google Haritalar yüklenemedi: {error}</div>}
      {!error && !loaded && (
        <div className="flex h-[280px] items-center justify-center text-sm text-zinc-400">
          Harita yükleniyor...
        </div>
      )}
      <div ref={mapRef} style={{ height: "280px", width: "100%", display: loaded ? "block" : "none" }} />
    </div>
  );
}
