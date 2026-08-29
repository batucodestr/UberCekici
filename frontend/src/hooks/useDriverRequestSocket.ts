import { useEffect, useState } from "react";

import { WS_BASE_URL } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { ServiceRequest } from "@/types";

export type IncomingRequest = ServiceRequest & { distance_to_driver_km: number };

function playNotificationTone() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
  } catch {
    // Ses API'si desteklenmiyorsa sessizce yoksay.
  }
}

export function useDriverRequestSocket(enabled: boolean) {
  const [incomingRequest, setIncomingRequest] = useState<IncomingRequest | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!enabled || !accessToken) return;

    const socket = new WebSocket(`${WS_BASE_URL}/ws/driver/location/?token=${accessToken}`);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as { kind: string; data: IncomingRequest };
      if (message.kind === "new_request") {
        setIncomingRequest(message.data);
        playNotificationTone();
      }
    };

    return () => socket.close();
  }, [enabled, accessToken]);

  return { incomingRequest, dismiss: () => setIncomingRequest(null) };
}
