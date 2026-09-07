import { useEffect, useRef, useState } from "react";

import { useGoogleMaps } from "@/lib/googleMaps";
import { WS_BASE_URL } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

const DEFAULT_CENTER = { lat: 39.0, lng: 35.0 };

interface DriverLocationMessage {
  kind: "driver_location";
  data: { driver_id: number; latitude: string; longitude: string };
}

export function AdminLiveMap() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { loaded, error } = useGoogleMaps();
  const [positions, setPositions] = useState<Record<number, { lat: number; lng: number }>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<number, any>>({}); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    if (!accessToken) return;
    const socket = new WebSocket(`${WS_BASE_URL}/ws/admin/live/?token=${accessToken}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as DriverLocationMessage | { kind: string };
      if (message.kind === "driver_location") {
        const { driver_id, latitude, longitude } = (message as DriverLocationMessage).data;
        setPositions((prev) => ({
          ...prev,
          [driver_id]: { lat: Number(latitude), lng: Number(longitude) },
        }));
      }
    };

    return () => socket.close();
  }, [accessToken]);

  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstanceRef.current) return;
    const google = window.google;
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 6,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      scrollwheel: false,
    });
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !mapInstanceRef.current) return;
    const google = window.google;
    const map = mapInstanceRef.current;
    const entries = Object.entries(positions);

    entries.forEach(([driverId, pos]) => {
      const id = Number(driverId);
      if (markersRef.current[id]) {
        markersRef.current[id].setPosition(pos);
      } else {
        markersRef.current[id] = new google.maps.Marker({
          map,
          position: pos,
          label: { text: "🚚", fontSize: "20px" },
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
        });
      }
    });

    if (entries.length === 1) {
      map.setCenter(entries[0][1]);
      map.setZoom(11);
    } else if (entries.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      entries.forEach(([, pos]) => bounds.extend(pos));
      map.fitBounds(bounds, 48);
    }
  }, [loaded, positions]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      {error && <div className="p-4 text-sm text-red-600">Google Haritalar yüklenemedi: {error}</div>}
      {!error && !loaded && (
        <div className="flex h-[360px] items-center justify-center text-sm text-zinc-400">
          Harita yükleniyor...
        </div>
      )}
      <div ref={mapRef} style={{ height: "360px", width: "100%", display: loaded ? "block" : "none" }} />
    </div>
  );
}
