import { Link } from "react-router-dom";

/**
 * iyzico üye işyeri başvurusunun zorunlu tuttuğu ödeme logoları bandı:
 * "iyzico ile Öde" + Visa + MasterCard. Görseller `frontend/public/payment/`
 * altında yerel olarak servis edilir (iyzico'nun resmi görselleri), böylece
 * dış sunucu erişilemese bile band kaybolmaz.
 *
 * Band hem halka açık yüzde (giriş ekranı, yasal sayfaların footer'ı) hem de
 * yönetici panelinin içinde gösterilir.
 */
export function PaymentBadges({
  tone = "light",
  className = "",
}: {
  /** "dark" koyu zeminde (giriş ekranı) kullanılır. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const isDark = tone === "dark";

  return (
    <div className={`flex flex-col items-center gap-2 sm:items-start ${className}`}>
      <p className={`text-[11px] font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
        Güvenli ödeme
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
        <img
          src="/payment/iyzico-ile-ode.png"
          alt="iyzico ile Öde"
          className={`h-8 w-auto rounded-md object-contain ${isDark ? "bg-white p-1" : ""}`}
          loading="lazy"
        />
        <img
          src="/payment/visa.svg"
          alt="Visa"
          className="h-8 w-auto object-contain"
          loading="lazy"
        />
        <img
          src="/payment/mastercard.svg"
          alt="MasterCard"
          className="h-8 w-auto object-contain"
          loading="lazy"
        />
      </div>
      <p className={`text-[11px] leading-relaxed ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
        Ödemeler iyzico altyapısı üzerinden 3D Secure ile alınır.{" "}
        <Link
          to="/teslimat-ve-iade"
          className={isDark ? "underline hover:text-zinc-300" : "underline hover:text-primary-600"}
        >
          Teslimat ve İade Koşulları
        </Link>
      </p>
    </div>
  );
}
