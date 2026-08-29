import { useQuery } from "@tanstack/react-query";

import { AdminLiveMap } from "@/components/AdminLiveMap";
import { fetchDashboardStats } from "@/services/admin";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchDashboardStats,
    refetchInterval: 15000,
  });

  const cards = [
    { label: "Günlük Sipariş", value: stats?.daily_orders ?? "-" },
    { label: "Aktif Çekici", value: stats?.active_drivers ?? "-" },
    { label: "Bekleyen Talepler", value: stats?.pending_requests ?? "-" },
    { label: "Günlük Ciro", value: stats ? `${stats.daily_revenue.toFixed(2)} ₺` : "-" },
    { label: "Haftalık Ciro", value: stats ? `${stats.weekly_revenue.toFixed(2)} ₺` : "-" },
    { label: "Tamamlanan İş", value: stats?.completed_jobs ?? "-" },
    { label: "Ortalama ETA", value: stats ? `${stats.average_eta_minutes} dk` : "-" },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold text-zinc-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card">
            <p className="text-xs text-zinc-400">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6 !p-0 overflow-hidden">
        <div className="p-4 pb-0">
          <h2 className="mb-3 font-semibold text-zinc-800">Canlı Çekici Haritası</h2>
        </div>
        <AdminLiveMap />
      </div>

      <div className="card mt-6">
        <h2 className="mb-4 font-semibold text-zinc-800">Hizmet Dağılımı</h2>
        <div className="space-y-2">
          {stats?.service_distribution.map((item) => (
            <div key={item.service_type__name} className="flex items-center justify-between text-sm">
              <span className="text-zinc-600">{item.service_type__name ?? "Bilinmiyor"}</span>
              <span className="font-semibold text-zinc-800">{item.total}</span>
            </div>
          ))}
          {(!stats || stats.service_distribution.length === 0) && (
            <p className="text-sm text-zinc-400">Henüz veri yok.</p>
          )}
        </div>
      </div>
    </div>
  );
}
