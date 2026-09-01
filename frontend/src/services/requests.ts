import { api } from "@/services/api";
import type { Quote, ServiceRequest, ServiceType, VehicleType } from "@/types";

export async function fetchVehicleTypes(): Promise<VehicleType[]> {
  const { data } = await api.get<{ results: VehicleType[] } | VehicleType[]>("/vehicle-types/");
  return Array.isArray(data) ? data : data.results;
}

export async function fetchServiceTypes(): Promise<ServiceType[]> {
  const { data } = await api.get<{ results: ServiceType[] } | ServiceType[]>("/service-types/");
  return Array.isArray(data) ? data : data.results;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const { data } = await api.get<GeocodeResult>("/geocode/", { params: { q: query } });
  return data;
}

export interface QuotePayload {
  vehicle_type_id: number;
  service_type_id: number;
  distance_km: number;
  duration_minutes: number;
  city?: string;
}

export async function getQuote(payload: QuotePayload): Promise<Quote> {
  const { data } = await api.post<Quote>("/quote/", payload);
  return data;
}

export interface CreateRequestPayload {
  vehicle_type: number;
  service_type: number;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  contact_name: string;
  contact_phone: string;
  note?: string;
}

export async function createServiceRequest(
  payload: CreateRequestPayload
): Promise<ServiceRequest> {
  const { data } = await api.post<ServiceRequest>("/request/", payload);
  return data;
}

export async function fetchMyRequests(): Promise<ServiceRequest[]> {
  const { data } = await api.get<{ results: ServiceRequest[] } | ServiceRequest[]>(
    "/request/mine/"
  );
  return Array.isArray(data) ? data : data.results;
}

export async function fetchOpenRequests(): Promise<ServiceRequest[]> {
  const { data } = await api.get<{ results: ServiceRequest[] } | ServiceRequest[]>(
    "/request/open/"
  );
  return Array.isArray(data) ? data : data.results;
}

export async function fetchRequestDetail(id: number): Promise<ServiceRequest> {
  const { data } = await api.get<ServiceRequest>(`/request/${id}/`);
  return data;
}

export async function acceptRequest(id: number): Promise<ServiceRequest> {
  const { data } = await api.post<ServiceRequest>(`/request/${id}/accept/`);
  return data;
}

export async function updateRequestStatus(
  id: number,
  status: ServiceRequest["status"]
): Promise<ServiceRequest> {
  const { data } = await api.post<ServiceRequest>(`/request/${id}/status/`, { status });
  return data;
}

export async function rateRequest(
  id: number,
  rating: number,
  comment?: string
): Promise<ServiceRequest> {
  const { data } = await api.post<ServiceRequest>(`/request/${id}/rate/`, { rating, comment });
  return data;
}
