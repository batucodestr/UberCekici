import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "@/store/authStore";

/** Panelin kök adresi — giriş sonrası ve "/" için varılan yer. */
export const ADMIN_HOME = "/admin";

/**
 * Site tamamen yönetici panelidir: müşteri ve sürücü işlemleri mobil
 * uygulamadan yürütülür, bu yüzden panelde yalnızca admin rolü geçerlidir.
 */
export function AdminRoute() {
  const user = useAuthStore((s) => s.user);

  if (!user || user.role !== "admin") {
    return <Navigate to="/giris" replace />;
  }

  return <Outlet />;
}
