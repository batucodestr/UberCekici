import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { TicketCategoryBadge, TicketStatusBadge } from "@/components/admin/TicketBadges";
import { fetchAdminTickets, fetchDashboardStats } from "@/services/admin";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchDashboardStats,
    refetchInterval: 15000,
  });

  const { data: latestTickets } = useQuery({
    queryKey: ["admin-tickets", "dashboard-latest"],
    queryFn: () => fetchAdminTickets({ ordering: "-created_at" }),
    refetchInterval: 30000,
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

  const ticketCards = [
    { label: "Açık Şikayet / İstek", value: stats?.open_tickets ?? "-", highlight: true },
    { label: "Acil (açık)", value: stats?.urgent_tickets ?? "-", highlight: false },
    { label: "Bugün Gelen", value: stats?.tickets_today ?? "-", highlight: false },
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

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ticketCards.map((card) => (
          <div
            key={card.label}
            className={`card ${card.highlight ? "!border-amber-200 !bg-amber-50" : ""}`}
          >
            <p className="text-xs text-zinc-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-800">Son Şikayet &amp; İstekler</h2>
          <Link
            to="/admin/tickets"
            className="flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-primary-600"
          >
            Tümünü gör
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y divide-zinc-100">
          {latestTickets?.results.slice(0, 5).map((ticket) => (
            <Link
              key={ticket.id}
              to="/admin/tickets"
              className="flex items-center gap-3 py-2.5 text-sm hover:bg-zinc-50"
            >
              <TicketCategoryBadge category={ticket.category} />
              <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">
                {ticket.subject}
              </span>
              <span className="hidden text-xs text-zinc-400 sm:inline">
                {new Date(ticket.created_at).toLocaleString("tr-TR")}
              </span>
              <TicketStatusBadge status={ticket.status} />
            </Link>
          ))}
          {latestTickets?.results.length === 0 && (
            <p className="py-2 text-sm text-zinc-400">Henüz şikayet veya istek yok.</p>
          )}
        </div>
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
