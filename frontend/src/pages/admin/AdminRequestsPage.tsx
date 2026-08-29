import { useState } from "react";

import { type Column, DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchAdminRequests } from "@/services/admin";
import type { RequestStatus, ServiceRequest } from "@/types";

const STATUS_OPTIONS: RequestStatus[] = [
  "created",
  "searching",
  "driver_found",
  "en_route",
  "arrived",
  "completed",
  "cancelled",
];

export default function AdminRequestsPage() {
  const [status, setStatus] = useState<string>("");

  const columns: Column<ServiceRequest>[] = [
    { key: "id", label: "#" },
    { key: "customer", label: "Müşteri", render: (row) => row.customer.username },
    { key: "driver", label: "Sürücü", render: (row) => row.driver?.username ?? "—" },
    { key: "vehicle_type", label: "Araç", render: (row) => row.vehicle_type.name },
    { key: "price", label: "Ücret (₺)" },
    { key: "distance_km", label: "Mesafe (km)" },
    { key: "status", label: "Durum", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "created_at",
      label: "Tarih",
      render: (row) => new Date(row.created_at).toLocaleString("tr-TR"),
    },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold text-zinc-900">Talepler</h1>
      <DataTable
        queryKey="admin-requests"
        fetchFn={fetchAdminRequests}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Müşteri, sürücü veya telefon ara..."
        extraParams={{ status }}
        filters={
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          >
            <option value="">Tüm Durumlar</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        }
      />
    </div>
  );
}
