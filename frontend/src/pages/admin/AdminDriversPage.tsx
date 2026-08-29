import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type Column, DataTable } from "@/components/admin/DataTable";
import { approveDriver, fetchAdminDrivers, rejectDriver } from "@/services/admin";
import type { AdminDriver, ApprovalStatus } from "@/types";

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Onay Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminDriversPage() {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: approveDriver,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-drivers"] }),
  });
  const rejectMutation = useMutation({
    mutationFn: rejectDriver,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-drivers"] }),
  });

  const columns: Column<AdminDriver>[] = [
    { key: "username", label: "Kullanıcı Adı", render: (row) => row.user.username },
    { key: "vehicle_plate", label: "Plaka" },
    { key: "vehicle_model", label: "Araç" },
    {
      key: "approval_status",
      label: "Onay Durumu",
      render: (row) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[row.approval_status]}`}
        >
          {STATUS_LABELS[row.approval_status]}
        </span>
      ),
    },
    {
      key: "is_online",
      label: "Çevrimiçi",
      render: (row) => (row.is_online ? "Evet" : "Hayır"),
    },
    { key: "rating", label: "Puan" },
    { key: "total_earnings", label: "Kazanç (₺)" },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold text-zinc-900">Çekiciler</h1>
      <DataTable
        queryKey="admin-drivers"
        fetchFn={fetchAdminDrivers}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Sürücü, plaka veya araç ara..."
        rowActions={(row) => (
          <>
            {row.approval_status !== "approved" && (
              <button
                onClick={() => approveMutation.mutate(row.id)}
                className="rounded-lg bg-primary-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-600"
              >
                Onayla
              </button>
            )}
            {row.approval_status !== "rejected" && (
              <button
                onClick={() => rejectMutation.mutate(row.id)}
                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Reddet
              </button>
            )}
          </>
        )}
      />
    </div>
  );
}
