import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Phone, RotateCcw, XCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { COMPANY } from "@/lib/company";
import { parseMerchantOid } from "@/lib/paytr";
import { PaymentShell } from "@/pages/payment/PaymentPage";
import { fetchPaymentStatus } from "@/services/payments";
import { useAuthStore } from "@/store/authStore";

/**
 * PayTR'nin `merchant_ok_url` / `merchant_fail_url` hedefi:
 * `/odeme/basarili` ve `/odeme/basarisiz`.
 *
 * ÖNEMLİ: PayTR bu sayfalara veri POST ETMEZ ve bu sayfaya düşmek ödeme
 * kanıtı DEĞİLDİR. Siparişin ödeme durumu yalnızca imzası doğrulanmış
 * sunucudan sunucuya bildirimle (2. Adım) güncellenir. Bu ekran, durumu
 * backend'den sorar ve yalnızca sunucunun doğruladığı sonucu gösterir.
 */
export default function PaymentResultPage({ outcome }: { outcome: "success" | "failure" }) {
  const { search } = useLocation();
  const merchantOid = parseMerchantOid(search);
  const isAuthenticated = Boolean(useAuthStore((state) => state.accessToken));

  // Durum sorgusu oturum gerektirir (uygulamanın WebView'inde oturum vardır).
  // Oturum yoksa sorgulamaya hiç gitmeyiz; ekran bilgilendirme metnine düşer.
  const canVerify = Boolean(merchantOid) && isAuthenticated;

  const { data, isLoading } = useQuery({
    queryKey: ["payment-status", merchantOid],
    queryFn: () => fetchPaymentStatus(merchantOid as string),
    enabled: canVerify,
    // Bildirim ödeme bitiminden saniyeler sonra düşebilir: kısa aralıkla
    // yenile, kesinleşince (paid/failed) dur.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === undefined ? 3000 : false;
    },
    retry: 1,
  });

  const verified = data?.status;
  const isPendingVerification = canVerify && (isLoading || verified === "pending");

  return (
    <PaymentShell>
      {outcome === "success" ? (
        isPendingVerification ? (
          <ResultCard
            tone="pending"
            icon={<Clock className="h-6 w-6" />}
            title="Ödemeniz doğrulanıyor"
            body="Bankanızdan gelen onay işleniyor. Bu ekranı kapatmayın; birkaç saniye sürebilir."
          />
        ) : verified === "paid" ? (
          <ResultCard
            tone="success"
            icon={<CheckCircle2 className="h-6 w-6" />}
            title="Ödemeniz alındı"
            body={`${formatAmount(data?.amount)} tutarındaki ödemeniz onaylandı. Talebiniz ödenmiş olarak işaretlendi.`}
            reference={data?.merchant_oid}
          />
        ) : verified === "failed" || verified === "mismatch" ? (
          <ResultCard
            tone="failure"
            icon={<XCircle className="h-6 w-6" />}
            title="Ödeme tamamlanamadı"
            body="Bankanızdan onay alınamadı. Hesabınızdan tutar çekildiyse en kısa sürede iade edilir."
            reference={data?.merchant_oid}
          />
        ) : (
          // Doğrulama yapılamadı (oturum yok ya da sipariş numarası gelmedi):
          // ödeme başarılı DENMEZ, yalnızca nereden kontrol edileceği söylenir.
          <ResultCard
            tone="pending"
            icon={<Clock className="h-6 w-6" />}
            title="Ödeme adımı tamamlandı"
            body="Ödemenizin onayı banka bildirimi ulaştığında işlenir. Güncel durumu uygulamadaki talep ekranından takip edebilirsiniz."
            reference={merchantOid ?? undefined}
          />
        )
      ) : (
        <ResultCard
          tone="failure"
          icon={<XCircle className="h-6 w-6" />}
          title="Ödeme başarısız"
          body={
            data?.failed_reason_msg ||
            "İşlem bankanız tarafından onaylanmadı. Kart bilgilerinizi kontrol edip yeniden deneyebilir veya farklı bir kart kullanabilirsiniz."
          }
          reference={data?.merchant_oid ?? merchantOid ?? undefined}
        />
      )}

      <div className="mt-6 space-y-3">
        {outcome === "failure" && (
          <p className="flex items-start gap-2 rounded-2xl bg-zinc-100 p-4 text-xs leading-relaxed text-zinc-600">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />
            Yeniden denemek için uygulamadaki talep ekranından ödeme adımını tekrar
            başlatabilirsiniz. Önceki denemede tutar tahsil edilmemiştir.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={`tel:${COMPANY.phoneHref}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            <Phone className="h-4 w-4" />
            Destek: {COMPANY.phone}
          </a>
          <Link
            to="/"
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
          >
            Ana sayfaya dön
          </Link>
        </div>

        <p className="text-center text-[11px] leading-relaxed text-zinc-400">
          İade ve iptal koşulları için{" "}
          <Link to="/teslimat-ve-iade" className="underline hover:text-zinc-600">
            Teslimat ve İade Koşulları
          </Link>{" "}
          sayfasına bakabilirsiniz.
        </p>
      </div>
    </PaymentShell>
  );
}

function formatAmount(amount?: string): string {
  if (!amount) return "";
  return `${Number(amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
}

const TONES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  failure: "border-red-200 bg-red-50 text-red-900",
  pending: "border-zinc-200 bg-white text-zinc-800",
} as const;

function ResultCard({
  tone,
  icon,
  title,
  body,
  reference,
}: {
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  title: string;
  body: string;
  reference?: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-card ${TONES[tone]}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-base font-bold">{title}</p>
          <p className="mt-1.5 text-sm leading-relaxed opacity-90">{body}</p>
          {reference && (
            <p className="mt-3 break-all text-[11px] font-medium opacity-70">
              İşlem numarası: {reference}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
