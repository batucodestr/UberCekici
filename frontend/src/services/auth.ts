import { api } from "@/services/api";
import type { AuthResponse, Role, User } from "@/types";

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role: Exclude<Role, "admin">;
}

export async function registerUser(payload: RegisterPayload): Promise<User> {
  const { data } = await api.post<User>("/auth/register/", payload);
  return data;
}

export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login/", { username, password });
  return data;
}

export async function fetchProfile(): Promise<User> {
  const { data } = await api.get<User>("/auth/profile/");
  return data;
}

export async function logoutUser(): Promise<void> {
  await api.post("/auth/logout/");
}

export async function updateProfile(
  payload: Partial<Pick<User, "first_name" | "last_name" | "email" | "phone_number">>
): Promise<User> {
  const { data } = await api.patch<User>("/auth/profile/", payload);
  return data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await api.post("/auth/change-password/", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}
