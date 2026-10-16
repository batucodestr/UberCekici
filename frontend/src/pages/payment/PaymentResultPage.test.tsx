import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PaymentResultPage from "@/pages/payment/PaymentResultPage";
import { fetchPaymentStatus } from "@/services/payments";
import { useAuthStore } from "@/store/authStore";
import type { PaymentTransaction } from "@/types";

vi.mock("@/services/payments", () => ({
  fetchPaymentStatus: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchPaymentStatus);

function transaction(overrides: Partial<PaymentTransaction> = {}): PaymentTransaction {
  return {
    id: 1,
    merchant_oid: "SRabc123",
    purpose: "service_request",
    status: "pending",
    amount: "1250.50",
    currency: "TL",
    total_amount: null,
    payment_type: "",
    installment_count: null,
    test_mode: true,
    service_request: 7,
    driver_subscription: null,
    subscription_plan: "",
    failed_reason_code: "",
    failed_reason_msg: "",
    paid_at: null,
    created_at: "2026-10-15T10:00:00Z",
    updated_at: "2026-10-15T10:00:00Z",
    ...overrides,
  };
}

function renderResult(outcome: "success" | "failure", search = "") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/odeme/basarili${search}`]}>
        <PaymentResultPage outcome={outcome} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Oturum durumunu değiştirmek abone bileşenleri yeniden render eder;
 *  React'in act(...) uyarısı vermemesi için sarmalanır. */
function setSession(accessToken: string | null) {
  act(() => {
    useAuthStore.setState({ user: null, accessToken });
  });
}

beforeEach(() => {
  mockedFetch.mockReset();
  setSession(null);
});

afterEach(() => {
  // Önce bileşenleri sök, sonra store'u sıfırla: aksi halde sökülmemiş
  // bileşen store güncellemesiyle test dışında render olur.
  cleanup();
  setSession(null);
});

/**
 * Bu dosyanın asıl amacı tek bir kuralı kilitlemek:
 * **Dönüş sayfasına düşmek ödeme kanıtı değildir.**
 * Ekran "Ödemeniz alındı" ifadesini YALNIZCA sunucu `status: "paid"`
 * döndürdüğünde göstermelidir.
 */
describe("PaymentResultPage — ödeme kanıtı yalnızca sunucudan gelir", () => {
  it("oturum yokken başarı sayfasına düşmek 'ödeme alındı' demez", async () => {
    renderResult("success", "?oid=SRabc123");

    // Oturum olmadığı için durum sorgusu hiç yapılmaz...
    expect(mockedFetch).not.toHaveBeenCalled();
    // ...ve ekran ödemeyi onaylamaz.
    expect(screen.queryByText("Ödemeniz alındı")).toBeNull();
    screen.getByText("Ödeme adımı tamamlandı");
  });

  it("sipariş numarası olmadan başarı iddia etmez", () => {
    setSession("jwt-token");
    renderResult("success");

    expect(mockedFetch).not.toHaveBeenCalled();
    expect(screen.queryByText("Ödemeniz alındı")).toBeNull();
    screen.getByText("Ödeme adımı tamamlandı");
  });

  it("sunucu 'paid' dediğinde başarıyı ve tutarı gösterir", async () => {
    setSession("jwt-token");
    mockedFetch.mockResolvedValue(
      transaction({ status: "paid", paid_at: "2026-10-15T10:01:00Z" })
    );

    renderResult("success", "?oid=SRabc123");

    await screen.findByText("Ödemeniz alındı");
    expect(mockedFetch).toHaveBeenCalledWith("SRabc123");
    screen.getByText(/1\.250,50 ₺/);
    screen.getByText(/SRabc123/);
  });

  it("sunucu hâlâ 'pending' derken başarı DEĞİL doğrulama ekranı gösterir", async () => {
    setSession("jwt-token");
    mockedFetch.mockResolvedValue(transaction({ status: "pending" }));

    renderResult("success", "?oid=SRabc123");

    await screen.findByText("Ödemeniz doğrulanıyor");
    expect(screen.queryByText("Ödemeniz alındı")).toBeNull();
  });

  it("başarı adresine düşülse bile sunucu 'failed' diyorsa hata gösterir", async () => {
    setSession("jwt-token");
    mockedFetch.mockResolvedValue(
      transaction({ status: "failed", failed_reason_code: "6" })
    );

    renderResult("success", "?oid=SRabc123");

    await screen.findByText("Ödeme tamamlanamadı");
    expect(screen.queryByText("Ödemeniz alındı")).toBeNull();
  });

  it("tutar uyuşmazlığını başarı olarak göstermez", async () => {
    setSession("jwt-token");
    mockedFetch.mockResolvedValue(transaction({ status: "mismatch" }));

    renderResult("success", "?oid=SRabc123");

    await screen.findByText("Ödeme tamamlanamadı");
    expect(screen.queryByText("Ödemeniz alındı")).toBeNull();
  });

  it("başarısızlık sayfası hiçbir koşulda başarı göstermez", async () => {
    setSession("jwt-token");
    mockedFetch.mockResolvedValue(transaction({ status: "paid" }));

    renderResult("failure", "?oid=SRabc123");

    screen.getByText("Ödeme başarısız");
    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    expect(screen.queryByText("Ödemeniz alındı")).toBeNull();
  });

  it("bozuk sipariş numarası sunucuya gönderilmez", () => {
    setSession("jwt-token");
    renderResult("success", "?oid=SR-123/../x");

    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
