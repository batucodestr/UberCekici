export type Role = "customer" | "driver" | "admin";

export interface UserProfile {
  default_address?: string;
  loyalty_points?: number;
  approval_status?: ApprovalStatus;
  is_online?: boolean;
  vehicle_plate?: string;
  vehicle_model?: string;
  rating?: string;
  total_earnings?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: Role;
  is_active_account: boolean;
  is_staff?: boolean;
  date_joined: string;
  last_login?: string | null;
  profile?: UserProfile | null;
  request_count?: number | null;
}

export interface AuthResponse {
  access: string;
  role: Role;
  user: User;
}

export interface VehicleType {
  id: number;
  name: string;
  icon: string;
  price_multiplier: string;
  is_active: boolean;
}

export interface ServiceType {
  id: number;
  name: string;
  display_name: string;
  recovery_multiplier: string;
  is_active: boolean;
}

export interface Quote {
  base_fee: number;
  distance_fee: number;
  night_fee: number;
  vehicle_fee: number;
  recovery_fee: number;
  total: number;
  is_night: boolean;
  distance_km: number;
  eta_minutes: number;
}

export type RequestStatus =
  | "created"
  | "searching"
  | "driver_found"
  | "en_route"
  | "arrived"
  | "completed"
  | "cancelled";

export interface ServiceRequest {
  id: number;
  customer: User;
  driver: User | null;
  vehicle_type: VehicleType;
  service_type: ServiceType;
  pickup_lat: string;
  pickup_lng: string;
  pickup_address: string;
  dropoff_lat: string;
  dropoff_lng: string;
  dropoff_address: string;
  distance_km: number;
  duration_minutes: number;
  price: string;
  contact_name: string;
  contact_phone: string;
  note: string;
  status: RequestStatus;
  rating: number | null;
  rating_comment: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  daily_orders: number;
  active_drivers: number;
  pending_requests: number;
  daily_revenue: number;
  weekly_revenue: number;
  completed_jobs: number;
  average_eta_minutes: number;
  service_distribution: { service_type__name: string; total: number }[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface AdminDriver {
  id: number;
  user: User;
  is_online: boolean;
  approval_status: ApprovalStatus;
  vehicle_plate: string;
  vehicle_model: string;
  total_earnings: string;
  rating: string;
  location: { latitude: string; longitude: string; heading: number; updated_at: string } | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor: number | null;
  actor_username: string | null;
  action: "create" | "update" | "delete" | "login" | "other";
  model_name: string;
  object_id: string;
  path: string;
  method: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export interface PriceRule {
  id: number;
  city: string;
  base_fee: string;
  price_per_km: string;
  night_surcharge: string;
  night_start_hour: number;
  night_end_hour: number;
  is_active: boolean;
  updated_at: string;
}
