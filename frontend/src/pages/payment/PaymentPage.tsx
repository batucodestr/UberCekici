import { Lock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { PaymentBadges } from "@/components/legal/PaymentBadges";
import { COMPANY } from "@/lib/company";
import { buildPaytrIframeSrc, isValidPaytrToken, PAYTR_RESIZER_SRC } from "@/lib/paytr";

/**
 * PayTR iFrame ödeme ekranı — `/odeme/:token`.
 *
 * Sayfa yalnızca PayTR'nin güvenli ödeme formunu barındırır. Kart numarası,
 * CVV ve son kullanma tarihi bu uygulamanın DOM'una hiç girmez; tamamı
 * PayTR'nin alan adındaki çerçevede kalır.
 *
 * Token, ödeme başlatma ucundan (`/api/payments/paytr/.../init/`) alınır.
 * Hem mobil uygulamanın WebView'i hem tarayıcı aynı sayfayı kullanır.
 */
export default function PaymentPage() {
  const { token } = useParams<{ token: string }>();
  const [resizerFailed, setResizerFailed] = useState(false);
  const isValid = isValidPaytrToken(token);

  useEffect(() => {
    if (!isValid) return;

    // PayTR'nin resmî iframeResizer betiği: çerçevenin boyunu içeriğe göre
    // ayarlar (3D Secure adımında form uzar). Betik yüklenemezse aşağıdaki
    // sabit yükseklik devreye girer, ödeme yine çalışır.
    const script = document.createElement("script");
    script.src = PAYTR_RESIZER_SRC;
    script.async = true;
    script.onload = () => {
      const resizer = (window as unknown as { iFrameResize?: (opts: object, target: string) => void })
        .iFrameResize;
      resizer?.({ checkOrigin: false }, "#paytriframe");
    };
    script.onerror = () => setResizerFailed(true);
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [isValid]);

  if (!isValid) {
    return (
      <PaymentShell>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Ödeme oturumu bulunamadı</p>
          <p className="mt-1.5 leading-relaxed">
            Ödeme bağlantısı geçersiz veya süresi dolmuş. Lütfen uygulamadan ödeme adımını
            yeniden başlatın.
          </p>
          <p className="mt-3">
            Sorun sürerse{" "}
            <a className="font-semibold underline" href={`tel:${COMPANY.phoneHref}`}>
              {COMPANY.phone}
            </a>{" "}
            numaralı destek hattımızı arayabilirsiniz.
          </p>
        </div>
      </PaymentShell>
    );
  }

  return (
    <PaymentShell>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-card">
        <iframe
          /* id, PayTR'nin iframeResizer betiğinin beklediği değerdir. */
          id="paytriframe"
          title="Güvenli ödeme"
          src={buildPaytrIframeSrc(token as string)}
          frameBorder={0}
          scrolling="no"
          className="w-full"
          style={{ minHeight: resizerFailed ? 900 : 620 }}
        />
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500">
        Ödeme ekranı {COMPANY.brandName} adına PayTR altyapısında açılır. Kart bilgileriniz
        bizim sunucularımıza iletilmez ve saklanmaz.
      </p>
    </PaymentShell>
  );
}

/**
 * Ödeme ekranının çerçevesi. Mevcut halka açık sayfaların görsel diline
 * (beyaz zemin, zinc tonları, 2xl köşeler) uyar; ancak bilinçli olarak
 * menü/footer taşımaz — ödeme sırasında kullanıcıyı sayfadan çıkaracak
 * bağlantı göstermemek için.
 */
export function PaymentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo.jpeg"
              alt={COMPANY.brandName}
              className="h-8 w-8 rounded-xl object-cover"
            />
            <span className="text-sm font-bold text-zinc-900">{COMPANY.brandName}</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <Lock className="h-3 w-3" />
            3D Secure
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <h1 className="text-lg font-extrabold text-zinc-900 sm:text-xl">Güvenli Ödeme</h1>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                Kart bilgileriniz ödeme kuruluşunun şifreli formunda işlenir.
              </p>
            </div>
          </div>

          {children}

          <div className="mt-8 border-t border-zinc-200 pt-5">
            <PaymentBadges />
          </div>
        </div>
      </main>
    </div>
  );
}
