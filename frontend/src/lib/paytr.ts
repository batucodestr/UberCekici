/**
 * PayTR iFrame ödeme ekranının istemci tarafı yardımcıları.
 *
 * Kart bilgisi ASLA bu uygulamada toplanmaz veya saklanmaz: ödeme formu
 * tamamen PayTR'nin kendi alan adındaki iFrame içinde çalışır, bizim
 * sayfamız yalnızca o çerçeveyi barındırır. Bu, PCI-DSS kapsamını PayTR'de
 * tutar.
 */

/** PayTR'nin ödeme formunu servis ettiği kaynak. */
export const PAYTR_ORIGIN = "https://www.paytr.com";

/** iFrame'in içeriğine göre boyunu ayarlayan resmî PayTR betiği. */
export const PAYTR_RESIZER_SRC = `${PAYTR_ORIGIN}/js/iframeResizer.min.js`;

/**
 * URL'den gelen token'ı iFrame adresine koymadan ÖNCE doğrularız: böylece
 * adrese yabancı bir şema ("javascript:") veya yol ("../") enjekte edilemez.
 *
 * İzin verilen küme harf/rakam/tire/alt çizgidir. Tire ZORUNLUDUR: gerçek
 * PayTR token'ı `<64 hex>-<rakamlar>` biçiminde gelir
 * (ör. "e5d3…fdb6-885693595"). Yalnızca alfanümerik kabul eden daha dar bir
 * kural, gerçek ödeme ekranının hiç açılmamasına yol açıyordu.
 *
 * `/`, `.`, `:` ve boşluk bilinçli olarak DIŞARIDA: yol gezinme ve şema
 * enjeksiyonu bu sayede engellenir.
 */
export function isValidPaytrToken(token: string | undefined): boolean {
  return typeof token === "string" && /^[A-Za-z0-9_-]{8,255}$/.test(token);
}

/** Resmî ödeme formu adresi: https://www.paytr.com/odeme/guvenli/{token} */
export function buildPaytrIframeSrc(token: string): string {
  if (!isValidPaytrToken(token)) {
    throw new Error("Geçersiz PayTR token'ı");
  }
  return `${PAYTR_ORIGIN}/odeme/guvenli/${token}`;
}

/** Ödeme sonucu sayfasının `?oid=` parametresindeki sipariş numarası. */
export function parseMerchantOid(search: string): string | null {
  const oid = new URLSearchParams(search).get("oid");
  // Sunucu merchant_oid'yi alfanümerik üretir; başka bir şey gelirse
  // sorgulamaya göndermeyiz.
  return oid && /^[A-Za-z0-9]{1,64}$/.test(oid) ? oid : null;
}
