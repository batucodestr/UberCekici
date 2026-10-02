import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { X } from "lucide-react";
import { useState } from "react";

import {
  createAdminTicket,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
} from "@/services/admin";
import type { TicketCategory, TicketPriority } from "@/types";

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

/** Telefonla/çağrı merkezinden gelen şikayet-isteği panelden kaydetmek için. */
export function NewTicketDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    category: "complaint" as TicketCategory,
    priority: "normal" as TicketPriority,
    subject: "",
    message: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
  });

  const mutation = useMutation({
    mutationFn: () => createAdminTicket(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      onClose();
    },
    onError: (err) => setError(errorMessage(err, "Kayıt oluşturulamadı.")),
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/40" role="presentation" onClick={onClose} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="relative w-full max-w-lg space-y-3 rounded-3xl bg-white p-6 shadow-soft"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Yeni Şikayet / İstek</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Telefonla gelen kayıtları buradan açabilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Kategori</span>
            <select
              className="input mt-1"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })}
            >
              {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
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
              onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
            >
              {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <input
          className="input"
          placeholder="Konu"
          maxLength={150}
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          required
        />
        <textarea
          className="input min-h-28"
          placeholder="Şikayet / istek detayı"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Ad Soyad"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          />
          <input
            className="input"
            placeholder="Telefon"
            value={form.contact_phone}
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
          />
        </div>
        <input
          className="input"
          type="email"
          placeholder="E-posta (opsiyonel)"
          value={form.contact_email}
          onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
        />

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-600 hover:border-zinc-300"
          >
            Vazgeç
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary !py-3 text-sm">
            {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
