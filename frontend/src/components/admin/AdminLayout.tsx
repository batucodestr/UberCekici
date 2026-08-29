import {
  ClipboardList,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Tags,
  Truck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { logoutUser } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/dashboard/requests", label: "Talepler", icon: ClipboardList },
  { to: "/admin/dashboard/drivers", label: "Çekiciler", icon: Truck },
  { to: "/admin/dashboard/users", label: "Kullanıcılar", icon: Users },
  { to: "/admin/dashboard/pricing", label: "Fiyat Kuralları", icon: Tags },
  { to: "/admin/dashboard/audit-logs", label: "Sistem Logları", icon: FileClock },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside
        className={`sticky top-0 flex h-screen flex-col border-r border-zinc-100 bg-white transition-all ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-4">
          <img src="/logo.png" alt="Uber Çekici" className="h-8 w-8 rounded-lg object-cover" />
          {!collapsed && <span className="font-bold text-zinc-900">Uber Çekici</span>}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-100 p-3">
          {!collapsed && (
            <p className="mb-2 truncate px-1 text-xs text-zinc-400">
              {user?.first_name || user?.username}
            </p>
          )}
          <button
            onClick={() => {
              logoutUser().catch(() => {});
              logout();
              navigate("/giris");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Çıkış</span>}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
