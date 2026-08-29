import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

const pickupIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const driverIcon = new L.DivIcon({
  html: '<div style="font-size:22px;transform:translate(-50%,-50%)">🚚</div>',
  className: "",
  iconSize: [0, 0],
});

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
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      <MapContainer
        center={[pickup.lat, pickup.lng]}
        zoom={13}
        style={{ height: "280px", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />
        <Marker position={[dropoff.lat, dropoff.lng]} icon={pickupIcon} />
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon} />
        )}
      </MapContainer>
    </div>
  );
}
