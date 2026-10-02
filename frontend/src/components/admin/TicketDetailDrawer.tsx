import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Trash2, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import {
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/admin/TicketBadges";
import {
  deleteAdminTicket,
  fetchAdminTicket,
  fetchAdminUsers,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  updateAdminTicket,
} from "@/services/admin";
import { useAuthStore } from "@/store/authStore";
import type { SupportTicket, TicketPriority, TicketStatus } from "@/types";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object") {
      const first = Object.values(detail)[0];
      if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    }
  }
  return fallback;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString("tr-TR") : "—";
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-800">{value || "—"}</p>
    </div>
  );
}

export function TicketDetailDrawer({
  initialTicket,
  onClose,
}: {
  initialTicket: SupportTicket;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  // Liste satırındaki veriyle anında açılır, sonra kaydın kendi sorgusu
  // (kaydet sonrası invalidate edilir) güncel hâli getirir.
  const { data: ticket } = useQuery({
    queryKey: ["admin-ticket", initialTicket.id],
    queryFn: () => fetchAdminTicket(initialTicket.id),
    initialData: initialTicket,
  });

  const [form, setForm] = useState({
    status: ticket.status,
    priority: ticket.priority,
    assigned_to: ticket.assigned_to,
    admin_note: ticket.admin_note,
    response: ticket.response,
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Liste yenilendiğinde (ör. WebSocket bildirimi sonrası) açık kayıt
  // güncellenirse formu sunucudaki son hâle göre tazele.
  useEffect(() => {
    setForm({
      status: ticket.status,
      priority: ticket.priority,
      assigned_to: ticket.assigned_to,
      admin_note: ticket.admin_note,
      response: ticket.response,
    });
  }, [ticket.id, ticket.updated_at]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const { data: admins } = useQuery({
    queryKey: ["admin-users", "admins-only"],
    queryFn: () => fetchAdminUsers({ role: "admin" }),
    staleTime: 5 * 60 * 1000,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-ticket", ticket.id] });
    queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    queryClient.invalidateQueries({ queryKey: ["admin-ticket-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAdminTicket(ticket.id, {
        status: form.status,
        priority: form.priority,
        assigned_to: form.assigned_to,
        admin_note: form.admin_note,
        response: form.response,
      }),
    onSuccess: () => {
      setError("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      invalidate();
    },
    onError: (err) => setError(errorMessage(err, "Kayıt güncellenemedi.")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminTicket(ticket.id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err) => setError(errorMessage(err, "Kayıt silinemedi.")),
  });

  const submitter = ticket.created_by_detail;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-zinc-900/40"
        role="presentation"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-soft">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-100 bg-white px-6 py-4">
          <div>
            <p className="text-xs text-zinc-400">Kayıt #{ticket.id}</p>
            <h2 className="mt-0.5 text-lg font-bold text-zinc-900">{ticket.subject}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <TicketCategoryBadge category={ticket.category} />
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
              <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                {ticket.source_display}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 px-6 py-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-zinc-800">Mesaj</h3>
            <p className="whitespace-pre-wrap rounded-2xl bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-700">
              {ticket.message}
            </p>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <Field
              label="Gönderen"
              value={
                submitter
                  ? `${submitter.first_name || submitter.username} (${submitter.username})`
                  : ticket.contact_name
              }
            />
            <Field label="Rol" value={submitter ? submitter.role : "Hesapsız / telefon"} />
            <Field label="Telefon" value={ticket.contact_phone || submitter?.phone_number} />
            <Field label="E-posta" value={ticket.contact_email || submitter?.email} />
            <Field
              label="İlgili Talep"
              value={ticket.service_request ? `#${ticket.service_request}` : "—"}
            />
            <Field label="Oluşturma" value={formatDate(ticket.created_at)} />
            <Field label="Yanıtlanma" value={formatDate(ticket.responded_at)} />
            <Field
              label="Kapanış"
              value={
                ticket.resolved_at
                  ? `${formatDate(ticket.resolved_at)} · ${ticket.resolved_by_username ?? ""}`
                  : "—"
              }
            />
          </section>

          <form
            className="space-y-4 border-t border-zinc-100 pt-5"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
            )}
            {saved && (
              <div className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700">
                Kayıt güncellendi.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">Durum</span>
                <select
                  className="input mt-1"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as TicketStatus })
                  }
                >
                  {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-zinc-500">Öncelik</span>
                <select
                  className="input mt-1"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value as TicketPriority })
                  }
                >
                  {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-zinc-500">Atanan Yönetici</span>
              <div className="mt-1 flex gap-2">
                <select
                  className="input"
                  value={form.assigned_to ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      assigned_to: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                >
                  <option value="">Atanmadı</option>
                  {admins?.results.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.first_name || admin.username}
                    </option>
                  ))}
                </select>
                {currentUser && form.assigned_to !== currentUser.id && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, assigned_to: currentUser.id })}
                    className="whitespace-nowrap rounded-xl border border-zinc-200 px-3 text-sm font-medium text-zinc-600 hover:border-primary-400"
                  >
                    Bana ata
                  </button>
                )}
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-500">
                Müşteriye Yanıt (mobil uygulamada görünür)
              </span>
              <textarea
                className="input mt-1 min-h-24"
                placeholder="Müşteriye iletilecek yanıtı yazın..."
                value={form.response}
                onChange={(e) => setForm({ ...form, response: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-500">
                İç Not (yalnızca yöneticiler görür)
              </span>
              <textarea
                className="input mt-1 min-h-20"
                placeholder="Ekip içi not..."
                value={form.admin_note}
                onChange={(e) => setForm({ ...form, admin_note: e.target.value })}
              />
            </label>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm(`#${ticket.id} kaydı kalıcı olarak silinsin mi?`)) {
                    deleteMutation.mutate();
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-500 hover:border-red-300 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Sil
              </button>
              <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}
