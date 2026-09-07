import { Search } from "lucide-react";
import { useEffect, useRef } from "react";

import { useGoogleMaps } from "@/lib/googleMaps";

export interface LatLng {
  lat: number;
  lng: number;
}

// Backend stores coordinates as DecimalField(max_digits=9, decimal_places=6).
// Raw values from map clicks/drags/geolocation carry many more floating-point
// digits than that, so they must be rounded here at the source or the create-request
// API call fails with a "too many digits" validation error.
export function round6(value: number): number {
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

const DRIVER_MARKER_LABEL = { text: "🚚", fontSize: "20px" };

export function LocationPicker({
  pickup,
  dropoff,
  activePoint,
  onChange,
  nearbyDrivers = [],
}: LocationPickerProps) {
  const { loaded, error } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapInstanceRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const pickupMarkerRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const dropoffMarkerRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const driverMarkersRef = useRef<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const activePointRef = useRef(activePoint);
  const onChangeRef = useRef(onChange);

  activePointRef.current = activePoint;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstanceRef.current) return;
    const google = window.google;
    const center = pickup ?? DEFAULT_CENTER;

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });
    mapInstanceRef.current = map;

    map.addListener("click", (e: any) => {
      // eslint-disable-line @typescript-eslint/no-explicit-any
      const value = roundLatLng({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      onChangeRef.current(activePointRef.current, value);
    });

    if (searchInputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: "tr" },
        fields: ["geometry", "formatted_address"],
      });
      autocomplete.bindTo("bounds", map);
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) return;
        const value = roundLatLng({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
        onChangeRef.current(activePointRef.current, value);
        map.panTo(value);
        map.setZoom(15);
      });
    }
  }, [loaded, pickup]);

  useEffect(() => {
    // Arama kutusu aktif nokta değiştiğinde önceki adresi göstermesin diye temizlenir.
    if (searchInputRef.current) searchInputRef.current.value = "";
  }, [activePoint]);

  useEffect(() => {
    if (!loaded || !mapInstanceRef.current) return;
    const google = window.google;
    const map = mapInstanceRef.current;

    if (pickup) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = new google.maps.Marker({
          map,
          position: pickup,
          draggable: true,
          label: { text: "B", color: "#fff", fontWeight: "bold" },
        });
        pickupMarkerRef.current.addListener("dragend", (e: any) => {
          // eslint-disable-line @typescript-eslint/no-explicit-any
          onChangeRef.current("pickup", roundLatLng({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
        });
      } else {
        pickupMarkerRef.current.setPosition(pickup);
      }
    }

    if (dropoff) {
      if (!dropoffMarkerRef.current) {
        dropoffMarkerRef.current = new google.maps.Marker({
          map,
          position: dropoff,
          draggable: true,
          label: { text: "V", color: "#fff", fontWeight: "bold" },
        });
        dropoffMarkerRef.current.addListener("dragend", (e: any) => {
          // eslint-disable-line @typescript-eslint/no-explicit-any
          onChangeRef.current("dropoff", roundLatLng({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
        });
      } else {
        dropoffMarkerRef.current.setPosition(dropoff);
      }
    }
  }, [loaded, pickup, dropoff]);

  useEffect(() => {
    if (!loaded || !mapInstanceRef.current) return;
    const google = window.google;
    const map = mapInstanceRef.current;

    driverMarkersRef.current.forEach((marker) => marker.setMap(null));
    driverMarkersRef.current = nearbyDrivers.map(
      (driver) =>
        new google.maps.Marker({
          map,
          position: driver,
          label: DRIVER_MARKER_LABEL,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0,
          },
        })
    );
  }, [loaded, nearbyDrivers]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      <div className="relative border-b border-zinc-200 bg-white p-2">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          ref={searchInputRef}
          type="text"
          disabled={!loaded}
          placeholder={
            activePoint === "pickup"
              ? "Başlangıç noktasını yazarak arayın..."
              : "Varış noktasını yazarak arayın..."
          }
          className="input !py-2 pl-9 text-sm"
        />
      </div>
      {error && (
        <div className="p-4 text-sm text-red-600">
          Google Haritalar yüklenemedi: {error}
        </div>
      )}
      {!error && !loaded && (
        <div className="flex h-[320px] items-center justify-center text-sm text-zinc-400">
          Harita yükleniyor...
        </div>
      )}
      <div ref={mapRef} style={{ height: "320px", width: "100%", display: loaded ? "block" : "none" }} />
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
