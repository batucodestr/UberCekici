import { api } from "@/services/api";
import type { User } from "@/types";

export interface DriverProfile {
  id: number;
  user: User;
  is_online: boolean;
  approval_status: "pending" | "approved" | "rejected";
  vehicle_plate: string;
  vehicle_model: string;
  total_earnings: string;
  rating: string;
  location: { latitude: string; longitude: string; heading: number; updated_at: string } | null;
}

export async function fetchMyDriverProfile(): Promise<DriverProfile> {
  const { data } = await api.get<DriverProfile>("/drivers/me/");
  return data;
}

export async function toggleOnline(): Promise<{ is_online: boolean }> {
  const { data } = await api.post<{ is_online: boolean }>("/drivers/toggle-online/");
  return data;
}

export async function updateDriverLocation(lat: number, lng: number): Promise<void> {
  await api.post("/driver/location/", { latitude: lat, longitude: lng });
}

export interface NearbyDriver {
  id: number;
  vehicle_model: string;
  latitude: string;
  longitude: string;
}

export async function fetchNearbyDrivers(): Promise<NearbyDriver[]> {
  const { data } = await api.get<{ results: NearbyDriver[] } | NearbyDriver[]>(
    "/drivers/nearby/"
  );
  return Array.isArray(data) ? data : data.results;
}
