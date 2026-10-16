import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { type Column, DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { approveTransfer, fetchAdminRequests } from "@/services/admin";
import type { PaymentStatus, RequestStatus, ServiceRequest } from "@/types";

const STATUS_OPTIONS: RequestStatus[] = [
  "created",
  "searching",
  "accepted",
  "driver_found",
  "en_route",
  "arrived",
  "completed",
  "cancelled",
];

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Ödenmedi",
  pending_approval: "Onay bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

export default function AdminRequestsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("pending_approval");

  const approveMutation = useMutation({
    mutationFn: approveTransfer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-requests"] }),
  });

  const columns: Column<ServiceRequest>[] = [
    { key: "id", label: "#" },
    { key: "customer", label: "Müşteri", render: (row) => row.customer.username },
    { key: "driver", label: "Sürücü", render: (row) => row.driver?.username ?? "—" },
    { key: "vehicle_type", label: "Araç", render: (row) => row.vehicle_type.name },
    { key: "price", label: "Ücret (₺)" },
    {
      key: "payment_method",
      label: "Ödeme",
      render: (row) => (row.payment_method === "bank_transfer" ? "Havale/EFT" : row.payment_method),
    },
    {
      key: "payment_status",
      label: "Ödeme durumu",
      render: (row) => PAYMENT_LABELS[row.payment_status] ?? row.payment_status,
    },
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
        extraParams={{ status, payment_status: paymentStatus }}
        rowActions={(row) =>
          row.payment_method === "bank_transfer" && row.payment_status === "pending_approval" ? (
            <button
              onClick={() => approveMutation.mutate(row.id)}
              disabled={approveMutation.isPending}
              className="rounded-lg bg-primary-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-600"
            >
              Ödemeyi onayla
            </button>
          ) : null
        }
        filters={
          <>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="">Tüm ödemeler</option>
              <option value="pending_approval">Havale onayı bekleyen</option>
              <option value="approved">Onaylanan</option>
              <option value="unpaid">Ödenmedi</option>
            </select>
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
          </>
        }
      />
    </div>
  );
}
