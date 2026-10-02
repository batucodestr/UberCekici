import { api } from "@/services/api";
import type {
  AdminDriver,
  AuditLog,
  DashboardStats,
  Paginated,
  PriceRule,
  Role,
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStats,
  TicketStatus,
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

export interface TicketWritePayload {
  category?: TicketCategory;
  subject?: string;
  message?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: number | null;
  admin_note?: string;
  response?: string;
  service_request?: number | null;
}

export async function fetchAdminTickets(params?: ListParams): Promise<Paginated<SupportTicket>> {
  const { data } = await api.get<Paginated<SupportTicket>>("/admin/tickets/", {
    params: buildParams(params),
  });
  return data;
}

export async function fetchAdminTicket(id: number): Promise<SupportTicket> {
  const { data } = await api.get<SupportTicket>(`/admin/tickets/${id}/`);
  return data;
}

export async function fetchTicketStats(): Promise<TicketStats> {
  const { data } = await api.get<TicketStats>("/admin/tickets/stats/");
  return data;
}

export async function updateAdminTicket(
  id: number,
  payload: TicketWritePayload
): Promise<SupportTicket> {
  const { data } = await api.patch<SupportTicket>(`/admin/tickets/${id}/`, payload);
  return data;
}

export async function createAdminTicket(payload: TicketWritePayload): Promise<SupportTicket> {
  const { data } = await api.post<SupportTicket>("/admin/tickets/", payload);
  return data;
}

export async function deleteAdminTicket(id: number): Promise<void> {
  await api.delete(`/admin/tickets/${id}/`);
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  complaint: "Şikayet",
  request: "İstek",
  suggestion: "Öneri",
  other: "Diğer",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  new: "Yeni",
  in_progress: "İnceleniyor",
  resolved: "Çözüldü",
  rejected: "Reddedildi",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Düşük",
  normal: "Normal",
  high: "Yüksek",
  urgent: "Acil",
};

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Müşteri",
  driver: "Çekici",
  admin: "Yönetici",
};
