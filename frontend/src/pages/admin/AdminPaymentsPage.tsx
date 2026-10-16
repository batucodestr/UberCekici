import { useState } from "react";

import { type Column, DataTable } from "@/components/admin/DataTable";
import { fetchPaymentTransactions } from "@/services/admin";
import type { PaymentPurpose, PaymentTransaction, PaymentTransactionStatus } from "@/types";

/**
 * PayTR ödeme işlemleri — mutabakat ekranı.
 *
 * Ekran bilinçli olarak SALT-OKUNURdur: bir işlemin durumu yalnızca imzası
 * doğrulanmış PayTR bildirimiyle (2. Adım) değişir. Panelden elle "ödendi"
 * işaretlemek mümkün değildir, aksi halde ödeme kanıtı sunucu doğrulamasından
 * koparılmış olurdu.
 *
 * "Tutar uyuşmazlığı" satırları manuel kontrol gerektirir: imza geçerliydi
 * ancak bildirilen tutar siparişteki tutarla örtüşmediği için sipariş
 * onaylanmadı.
 */

const STATUS_LABELS: Record<PaymentTransactionStatus, string> = {
  pending: "Bekliyor",
  paid: "Ödendi",
  failed: "Başarısız",
  mismatch: "Tutar uyuşmazlığı",
};

const STATUS_TONES: Record<PaymentTransactionStatus, string> = {
  pending: "bg-zinc-100 text-zinc-600",
  paid: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  mismatch: "bg-amber-50 text-amber-800",
};

const PURPOSE_LABELS: Record<PaymentPurpose, string> = {
  service_request: "Hizmet talebi",
  driver_subscription: "Sürücü paketi",
};

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");

  const columns: Column<PaymentTransaction>[] = [
    {
      key: "merchant_oid",
      label: "Sipariş no",
      render: (row) => <span className="font-mono text-xs">{row.merchant_oid}</span>,
    },
    {
      key: "purpose",
      label: "Tür",
      render: (row) => PURPOSE_LABELS[row.purpose] ?? row.purpose,
    },
    {
      key: "amount",
      label: "Tutar (₺)",
      render: (row) => Number(row.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 }),
    },
    {
      key: "total_amount",
      label: "Tahsil (₺)",
      render: (row) =>
        row.total_amount
          ? Number(row.total_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })
          : "—",
    },
    {
      key: "status",
      label: "Durum",
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            STATUS_TONES[row.status] ?? "bg-zinc-100 text-zinc-600"
          }`}
        >
          {STATUS_LABELS[row.status] ?? row.status}
        </span>
      ),
    },
    {
      key: "payment_type",
      label: "Yöntem",
      render: (row) => {
        const kind = row.payment_type === "eft" ? "EFT" : row.payment_type ? "Kart" : "—";
        const installment =
          row.installment_count && row.installment_count > 1
            ? ` · ${row.installment_count} taksit`
            : "";
        return `${kind}${installment}`;
      },
    },
    {
      key: "test_mode",
      label: "Mod",
      render: (row) =>
        row.test_mode ? (
          <span className="text-xs font-semibold text-amber-700">TEST</span>
        ) : (
          <span className="text-xs text-zinc-500">Canlı</span>
        ),
    },
    {
      key: "service_request",
      label: "İlgili kayıt",
      render: (row) =>
        row.service_request
          ? `Talep #${row.service_request}`
          : row.subscription_plan
            ? `Paket: ${row.subscription_plan}`
            : "—",
    },
    {
      key: "failed_reason_msg",
      label: "Not",
      render: (row) => (
        <span className="text-xs text-zinc-500">
          {row.failed_reason_code ? `[${row.failed_reason_code}] ` : ""}
          {row.failed_reason_msg || "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Tarih",
      render: (row) =>
        new Date(row.paid_at ?? row.created_at).toLocaleString("tr-TR"),
    },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold text-zinc-900">Ödemeler</h1>
      <p className="mb-4 text-xs leading-relaxed text-zinc-500">
        PayTR üzerinden alınan kart ödemeleri. Kayıtlar salt-okunurdur; bir ödeme yalnızca
        PayTR&apos;nin imzalı bildirimiyle &quot;Ödendi&quot; olur.{" "}
        <span className="font-semibold text-amber-800">Tutar uyuşmazlığı</span> satırları
        manuel mutabakat gerektirir.
      </p>
      <DataTable
        queryKey="admin-payment-transactions"
        fetchFn={fetchPaymentTransactions}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Sipariş no, kullanıcı adı veya e-posta ara..."
        extraParams={{ status, purpose }}
        filters={
          <div className="flex flex-wrap gap-2">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Tüm durumlar</option>
              {(Object.keys(STATUS_LABELS) as PaymentTransactionStatus[]).map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
            <select
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Tüm türler</option>
              {(Object.keys(PURPOSE_LABELS) as PaymentPurpose[]).map((value) => (
                <option key={value} value={value}>
                  {PURPOSE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        }
      />
    </div>
  );
}
