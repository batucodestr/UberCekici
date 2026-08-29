import { History, LogOut, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { logoutUser } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";

export function Navbar({ title }: { title: string }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Uber Çekici" className="h-9 w-9 rounded-xl object-cover" />
        <div>
          <p className="text-xs text-zinc-400">Uber Çekici</p>
          <h1 className="text-lg font-bold text-zinc-900">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {user?.role === "customer" && (
          <Link
            to="/musteri/gecmisim"
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:border-primary-300 hover:text-primary-600"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Geçmişim</span>
          </Link>
        )}
        {(user?.role === "customer" || user?.role === "driver") && (
          <Link
            to="/ayarlar"
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:border-primary-300 hover:text-primary-600"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Ayarlar</span>
          </Link>
        )}
        <span className="hidden text-sm text-zinc-500 sm:inline">
          {user?.first_name || user?.username}
        </span>
        <button
          onClick={() => {
            logoutUser().catch(() => {});
            logout();
            navigate("/giris");
          }}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:border-red-300 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Çıkış
        </button>
      </div>
    </header>
  );
}
