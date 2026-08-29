import { type Column, DataTable } from "@/components/admin/DataTable";
import { fetchAuditLogs } from "@/services/admin";
import type { AuditLog } from "@/types";

const ACTION_LABELS: Record<AuditLog["action"], string> = {
  create: "Oluşturma",
  update: "Güncelleme",
  delete: "Silme",
  login: "Giriş",
  other: "Diğer",
};

const ACTION_COLORS: Record<AuditLog["action"], string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login: "bg-zinc-100 text-zinc-600",
  other: "bg-zinc-100 text-zinc-600",
};

export default function AdminAuditLogPage() {
  const columns: Column<AuditLog>[] = [
    {
      key: "created_at",
      label: "Zaman",
      render: (row) => new Date(row.created_at).toLocaleString("tr-TR"),
    },
    { key: "actor_username", label: "Kullanıcı", render: (row) => row.actor_username ?? "—" },
    {
      key: "action",
      label: "İşlem",
      render: (row) => (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ACTION_COLORS[row.action]}`}>
          {ACTION_LABELS[row.action]}
        </span>
      ),
    },
    { key: "model_name", label: "Model", render: (row) => row.model_name || "—" },
    { key: "object_id", label: "Kayıt ID" },
    { key: "method", label: "HTTP" },
    { key: "path", label: "Yol" },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold text-zinc-900">Sistem Logları</h1>
      <p className="mb-4 text-xs text-zinc-400">
        Silinemez denetim kaydı — kim, ne zaman, hangi kaydı, nasıl değiştirdi.
      </p>
      <DataTable
        queryKey="admin-audit-logs"
        fetchFn={fetchAuditLogs}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Model veya yol ara..."
      />
    </div>
  );
}
