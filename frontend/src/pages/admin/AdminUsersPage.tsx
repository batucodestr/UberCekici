import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { type Column, DataTable } from "@/components/admin/DataTable";
import { ROLE_LABELS, fetchAdminUsers, setAdminUserPassword, updateAdminUser } from "@/services/admin";
import type { Role, User } from "@/types";

const ROLE_OPTIONS: Role[] = ["customer", "driver", "admin"];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) => updateAdminUser(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, is_active_account }: { id: number; is_active_account: boolean }) =>
      updateAdminUser(id, { is_active_account }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      setAdminUserPassword(id, password),
    onSuccess: () => {
      setPasswordTarget(null);
      setNewPassword("");
    },
  });

  const columns: Column<User>[] = [
    { key: "username", label: "Kullanıcı Adı" },
    { key: "email", label: "E-posta" },
    {
      key: "role",
      label: "Rol",
      render: (row) => (
        <select
          value={row.role}
          onChange={(e) => roleMutation.mutate({ id: row.id, role: e.target.value as Role })}
          className="rounded-lg border border-zinc-200 px-2 py-1 text-xs"
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "is_active_account",
      label: "Durum",
      render: (row) => (
        <button
          onClick={() =>
            activeMutation.mutate({ id: row.id, is_active_account: !row.is_active_account })
          }
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            row.is_active_account
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {row.is_active_account ? "Aktif" : "Kapalı"}
        </button>
      ),
    },
    {
      key: "date_joined",
      label: "Kayıt Tarihi",
      render: (row) => new Date(row.date_joined).toLocaleDateString("tr-TR"),
    },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold text-zinc-900">Kullanıcılar</h1>
      <DataTable
        queryKey="admin-users"
        fetchFn={fetchAdminUsers}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Kullanıcı ara..."
        rowActions={(row) => (
          <button
            onClick={() => setPasswordTarget(row)}
            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:border-primary-300 hover:text-primary-600"
          >
            Şifre Sıfırla
          </button>
        )}
      />

      {passwordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 className="mb-3 font-semibold text-zinc-900">
              {passwordTarget.username} için yeni şifre
            </h2>
            <input
              type="password"
              className="input"
              placeholder="Yeni şifre"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setPasswordTarget(null)}
                className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm"
              >
                Vazgeç
              </button>
              <button
                onClick={() =>
                  passwordMutation.mutate({ id: passwordTarget.id, password: newPassword })
                }
                disabled={newPassword.length < 8}
                className="btn-primary flex-1"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
