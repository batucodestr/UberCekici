import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { type Column, DataTable } from "@/components/admin/DataTable";
import {
  ROLE_LABELS,
  deleteAdminUser,
  fetchAdminUsers,
  setAdminUserPassword,
  updateAdminUser,
} from "@/services/admin";
import type { Role, User } from "@/types";

const ROLE_OPTIONS: Role[] = ["customer", "driver", "admin"];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [detailTarget, setDetailTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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
          <>
            <button
              onClick={() => setDetailTarget(row)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:border-primary-300 hover:text-primary-600"
            >
              Detay
            </button>
            <button
              onClick={() => setPasswordTarget(row)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:border-primary-300 hover:text-primary-600"
            >
              Şifre Sıfırla
            </button>
            <button
              onClick={() => setDeleteTarget(row)}
              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Sil
            </button>
          </>
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

      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="mb-4 font-semibold text-zinc-900">Hesap Detayları</h2>
            <dl className="space-y-2 text-sm">
              <Detail label="Kullanıcı Adı" value={detailTarget.username} />
              <Detail label="Ad Soyad" value={`${detailTarget.first_name} ${detailTarget.last_name}`.trim() || "-"} />
              <Detail label="E-posta" value={detailTarget.email} />
              <Detail label="Telefon" value={detailTarget.phone_number || "-"} />
              <Detail label="Rol" value={ROLE_LABELS[detailTarget.role]} />
              <Detail label="Durum" value={detailTarget.is_active_account ? "Aktif" : "Kapalı (Banlı)"} />
              <Detail label="Yönetici mi" value={detailTarget.is_staff ? "Evet" : "Hayır"} />
              <Detail
                label="Kayıt Tarihi"
                value={new Date(detailTarget.date_joined).toLocaleString("tr-TR")}
              />
              <Detail
                label="Son Giriş"
                value={detailTarget.last_login ? new Date(detailTarget.last_login).toLocaleString("tr-TR") : "-"}
              />
              {detailTarget.request_count != null && (
                <Detail label="Toplam Talep" value={String(detailTarget.request_count)} />
              )}
              {detailTarget.profile?.default_address !== undefined && (
                <Detail label="Adres" value={detailTarget.profile.default_address || "-"} />
              )}
              {detailTarget.profile?.loyalty_points !== undefined && (
                <Detail label="Sadakat Puanı" value={String(detailTarget.profile.loyalty_points)} />
              )}
              {detailTarget.profile?.vehicle_plate !== undefined && (
                <Detail label="Araç Plaka" value={detailTarget.profile.vehicle_plate || "-"} />
              )}
              {detailTarget.profile?.vehicle_model !== undefined && (
                <Detail label="Araç Model" value={detailTarget.profile.vehicle_model || "-"} />
              )}
              {detailTarget.profile?.approval_status !== undefined && (
                <Detail label="Onay Durumu" value={detailTarget.profile.approval_status} />
              )}
              {detailTarget.profile?.rating !== undefined && (
                <Detail label="Puan" value={detailTarget.profile.rating} />
              )}
              {detailTarget.profile?.total_earnings !== undefined && (
                <Detail label="Toplam Kazanç" value={detailTarget.profile.total_earnings} />
              )}
            </dl>
            <button
              onClick={() => setDetailTarget(null)}
              className="btn-primary mt-5 w-full"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 className="mb-3 font-semibold text-zinc-900">Kullanıcıyı Sil</h2>
            <p className="mb-4 text-sm text-zinc-600">
              <strong>{deleteTarget.username}</strong> hesabını kalıcı olarak silmek istediğinize
              emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm"
              >
                Vazgeç
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Sil
              </button>
            </div>
            {deleteMutation.isError && (
              <p className="mt-2 text-xs text-red-600">Silme işlemi başarısız oldu.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-100 pb-1.5">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-900">{value}</dd>
    </div>
  );
}
