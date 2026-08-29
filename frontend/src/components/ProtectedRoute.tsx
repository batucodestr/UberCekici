import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/types";

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/giris" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <Outlet />;
}

export function roleHome(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "driver":
      return "/surucu";
    default:
      return "/musteri";
  }
}
