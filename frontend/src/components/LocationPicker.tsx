import L from "leaflet";
import { useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const pickupIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const driverIcon = new L.DivIcon({
  html: '<div style="font-size:20px;transform:translate(-50%,-50%)">🚚</div>',
  className: "",
  iconSize: [0, 0],
});

export interface LatLng {
  lat: number;
  lng: number;
}

// Backend stores coordinates as DecimalField(max_digits=9, decimal_places=6).
// Raw values from Leaflet clicks/drags/geolocation carry many more floating-point
// digits than that, so they must be rounded here at the source or the create-request
// API call fails with a "too many digits" validation error.
function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function roundLatLng({ lat, lng }: LatLng): LatLng {
  return { lat: round6(lat), lng: round6(lng) };
}

interface LocationPickerProps {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  activePoint: "pickup" | "dropoff";
  onChange: (point: "pickup" | "dropoff", value: LatLng) => void;
  nearbyDrivers?: LatLng[];
}

const DEFAULT_CENTER: LatLng = { lat: 41.0082, lng: 28.9784 };

function ClickHandler({
  activePoint,
  onChange,
}: Pick<LocationPickerProps, "activePoint" | "onChange">) {
  useMapEvents({
    click(e) {
      onChange(activePoint, roundLatLng({ lat: e.latlng.lat, lng: e.latlng.lng }));
    },
  });
  return null;
}

export function LocationPicker({
  pickup,
  dropoff,
  activePoint,
  onChange,
  nearbyDrivers = [],
}: LocationPickerProps) {
  const [center] = useState<LatLng>(pickup ?? DEFAULT_CENTER);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        style={{ height: "320px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler activePoint={activePoint} onChange={onChange} />
        {nearbyDrivers.map((driver, index) => (
          <Marker key={index} position={[driver.lat, driver.lng]} icon={driverIcon} />
        ))}
        {pickup && (
          <Marker
            position={[pickup.lat, pickup.lng]}
            icon={pickupIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target as L.Marker;
                const pos = marker.getLatLng();
                onChange("pickup", roundLatLng({ lat: pos.lat, lng: pos.lng }));
              },
            }}
          />
        )}
        {dropoff && (
          <Marker
            position={[dropoff.lat, dropoff.lng]}
            icon={pickupIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target as L.Marker;
                const pos = marker.getLatLng();
                onChange("dropoff", roundLatLng({ lat: pos.lat, lng: pos.lng }));
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

export function getCurrentLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tarayıcınız konum servisini desteklemiyor."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve(roundLatLng({ lat: pos.coords.latitude, lng: pos.coords.longitude })),
      () => reject(new Error("Konum alınamadı.")),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}
