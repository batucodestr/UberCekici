import { api } from "@/services/api";
import type {
  AdminDriver,
  AuditLog,
  DashboardStats,
  Paginated,
  PriceRule,
  Role,
  User,
} from "@/types";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("/admin/dashboard/");
  return data;
}

export interface ListParams {
  page?: number;
  search?: string;
  ordering?: string;
  [key: string]: string | number | undefined;
}

function buildParams(params: ListParams = {}) {
  const cleaned: Record<string, string | number> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") cleaned[key] = value;
  });
  return cleaned;
}

export async function fetchAdminUsers(params?: ListParams): Promise<Paginated<User>> {
  const { data } = await api.get<Paginated<User>>("/admin/users/", { params: buildParams(params) });
  return data;
}

export async function updateAdminUser(
  id: number,
  payload: Partial<Pick<User, "role" | "is_active_account" | "first_name" | "last_name">>
): Promise<User> {
  const { data } = await api.patch<User>(`/admin/users/${id}/`, payload);
  return data;
}

export async function setAdminUserPassword(id: number, password: string): Promise<void> {
  await api.post(`/admin/users/${id}/set-password/`, { password });
}

export async function deleteAdminUser(id: number): Promise<void> {
  await api.delete(`/admin/users/${id}/`);
}

export async function fetchAdminDrivers(params?: ListParams): Promise<Paginated<AdminDriver>> {
  const { data } = await api.get<Paginated<AdminDriver>>("/admin/drivers/", {
    params: buildParams(params),
  });
  return data;
}

export async function approveDriver(id: number): Promise<AdminDriver> {
  const { data } = await api.post<AdminDriver>(`/admin/drivers/${id}/approve/`);
  return data;
}

export async function rejectDriver(id: number): Promise<AdminDriver> {
  const { data } = await api.post<AdminDriver>(`/admin/drivers/${id}/reject/`);
  return data;
}

export async function fetchAdminRequests(
  params?: ListParams
): Promise<Paginated<import("@/types").ServiceRequest>> {
  const { data } = await api.get("/admin/requests/", { params: buildParams(params) });
  return data;
}

export async function fetchAuditLogs(params?: ListParams): Promise<Paginated<AuditLog>> {
  const { data } = await api.get<Paginated<AuditLog>>("/admin/audit-logs/", {
    params: buildParams(params),
  });
  return data;
}

export async function fetchPriceRules(): Promise<PriceRule[]> {
  const { data } = await api.get<{ results: PriceRule[] } | PriceRule[]>("/price-rules/");
  return Array.isArray(data) ? data : data.results;
}

export async function updatePriceRule(
  id: number,
  payload: Partial<Omit<PriceRule, "id" | "updated_at">>
): Promise<PriceRule> {
  const { data } = await api.patch<PriceRule>(`/price-rules/${id}/`, payload);
  return data;
}

export async function createPriceRule(
  payload: Partial<Omit<PriceRule, "id" | "updated_at">>
): Promise<PriceRule> {
  const { data } = await api.post<PriceRule>("/price-rules/", payload);
  return data;
}

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Müşteri",
  driver: "Çekici",
  admin: "Yönetici",
};
