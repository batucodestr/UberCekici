import { useEffect, useState } from "react";

import { WS_BASE_URL } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { ServiceRequest } from "@/types";

export interface DriverLatLng {
  lat: number;
  lng: number;
}

type WsMessage =
  | { kind: "request"; data: ServiceRequest }
  | { kind: "driver_location"; data: { driver_id?: number; latitude: string; longitude: string } };

export function useRequestTracking(requestId: number | null, initial?: ServiceRequest) {
  const [request, setRequest] = useState<ServiceRequest | undefined>(initial);
  const [driverLocation, setDriverLocation] = useState<DriverLatLng | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!requestId || !accessToken) return;

    const socket = new WebSocket(
      `${WS_BASE_URL}/ws/request/${requestId}/?token=${accessToken}`
    );

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as WsMessage;
      if (message.kind === "request") {
        setRequest(message.data);
      } else if (message.kind === "driver_location") {
        setDriverLocation({
          lat: Number(message.data.latitude),
          lng: Number(message.data.longitude),
        });
      }
    };

    return () => socket.close();
  }, [requestId, accessToken]);

  return { request, driverLocation };
}
