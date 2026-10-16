import { api } from "@/services/api";
import type { PaymentInitResponse, PaymentTransaction, SubscriptionPlan } from "@/types";

/**
 * Ödeme başlatma uçları. Tutar BİLİNÇLİ olarak gönderilmez: sunucu, tutarı
 * talebin kendi kaydından ya da sabit paket fiyatından okur. İstemciden
 * gelen bir tutar backend tarafından yok sayılır.
 */

/** Hizmet talebi için kart ödemesi başlatır. */
export async function startServiceRequestPayment(
  requestId: number
): Promise<PaymentInitResponse> {
  const { data } = await api.post<PaymentInitResponse>(
    `/payments/paytr/requests/${requestId}/init/`
  );
  return data;
}

/** Sürücü paketi için kart ödemesi başlatır. */
export async function startSubscriptionPayment(
  plan: SubscriptionPlan
): Promise<PaymentInitResponse> {
  const { data } = await api.post<PaymentInitResponse>("/payments/paytr/subscription/init/", {
    plan,
  });
  return data;
}

/**
 * Ödemenin SUNUCUDA doğrulanmış durumunu sorar.
 *
 * Başarı sayfasına düşmek ödeme kanıtı değildir; gerçek durum yalnızca
 * PayTR'nin imzalı bildirimiyle güncellenir ve bu uçtan okunur.
 */
export async function fetchPaymentStatus(merchantOid: string): Promise<PaymentTransaction> {
  const { data } = await api.get<PaymentTransaction>(
    `/payments/paytr/transactions/${merchantOid}/`
  );
  return data;
}
