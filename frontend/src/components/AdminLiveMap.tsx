import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import { WS_BASE_URL } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

const driverIcon = new L.DivIcon({
  html: '<div style="font-size:22px;transform:translate(-50%,-50%)">🚚</div>',
  className: "",
  iconSize: [0, 0],
});

const DEFAULT_CENTER: [number, number] = [39.0, 35.0];

interface DriverLocationMessage {
  kind: "driver_location";
  data: { driver_id: number; latitude: string; longitude: string };
}

export function AdminLiveMap() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [positions, setPositions] = useState<Record<number, [number, number]>>({});
  const socketRef = useRef<WebSocket | null>(null);

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
          [driver_id]: [Number(latitude), Number(longitude)],
        }));
      }
    };

    return () => socket.close();
  }, [accessToken]);

  const entries = Object.entries(positions);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      <MapContainer
        center={entries.length ? entries[0][1] : DEFAULT_CENTER}
        zoom={entries.length ? 11 : 6}
        style={{ height: "360px", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {entries.map(([driverId, pos]) => (
          <Marker key={driverId} position={pos} icon={driverIcon} />
        ))}
      </MapContainer>
    </div>
  );
}
