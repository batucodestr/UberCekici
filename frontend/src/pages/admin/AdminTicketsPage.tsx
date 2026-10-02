import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { type Column, DataTable } from "@/components/admin/DataTable";
import { NewTicketDialog } from "@/components/admin/NewTicketDialog";
import {
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/admin/TicketBadges";
import { TicketDetailDrawer } from "@/components/admin/TicketDetailDrawer";
import {
  fetchAdminTickets,
  fetchTicketStats,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "@/services/admin";
import type { SupportTicket } from "@/types";

export default function AdminTicketsPage() {
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["admin-ticket-stats"],
    queryFn: fetchTicketStats,
    refetchInterval: 30000,
  });

  const cards = [
    { label: "Açık Kayıt", value: stats?.open ?? "-" },
    { label: "Yeni", value: stats?.new ?? "-" },
    { label: "İnceleniyor", value: stats?.in_progress ?? "-" },
    { label: "Acil (açık)", value: stats?.urgent_open ?? "-" },
    { label: "Bugün Gelen", value: stats?.today ?? "-" },
    { label: "Çözüldü", value: stats?.resolved ?? "-" },
  ];

  const columns: Column<SupportTicket>[] = [
    { key: "id", label: "#" },
    {
      key: "category",
      label: "Tür",
      render: (row) => <TicketCategoryBadge category={row.category} />,
    },
    {
      key: "subject",
      label: "Konu",
      render: (row) => (
        <div className="max-w-xs">
          <p className="truncate font-medium text-zinc-900">{row.subject}</p>
          <p className="truncate text-xs text-zinc-400">{row.message}</p>
        </div>
      ),
    },
    {
      key: "created_by",
      label: "Gönderen",
      render: (row) => (
        <div>
          <p className="text-zinc-800">
            {row.created_by_detail?.username ?? (row.contact_name || "—")}
          </p>
          <p className="text-xs text-zinc-400">{row.contact_phone || row.source_display}</p>
        </div>
      ),
    },
    {
      key: "priority",
      label: "Öncelik",
      render: (row) => <TicketPriorityBadge priority={row.priority} />,
    },
    { key: "status", label: "Durum", render: (row) => <TicketStatusBadge status={row.status} /> },
    {
      key: "assigned_to",
      label: "Atanan",
      render: (row) => row.assigned_to_username ?? "—",
    },
    {
      key: "created_at",
      label: "Tarih",
      render: (row) => new Date(row.created_at).toLocaleString("tr-TR"),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Şikayet &amp; İstekler</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Mobil uygulamadan gelen müşteri ve sürücü bildirimleri burada toplanır.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="btn-primary !py-2.5 text-sm"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Yeni Kayıt
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="card !p-4">
            <p className="text-xs text-zinc-400">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{card.value}</p>
          </div>
        ))}
      </div>

      <DataTable
        queryKey="admin-tickets"
        fetchFn={fetchAdminTickets}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Konu, mesaj, ad veya telefon ara..."
        extraParams={{ status, category, priority }}
        onRowClick={(row) => setSelected(row)}
        filters={
          <div className="flex flex-wrap gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="">Tüm Durumlar</option>
              {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="">Tüm Türler</option>
              {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="">Tüm Öncelikler</option>
              {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {selected && (
        <TicketDetailDrawer initialTicket={selected} onClose={() => setSelected(null)} />
      )}
      {creating && <NewTicketDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
