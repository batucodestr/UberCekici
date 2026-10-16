import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import PaymentPage from "@/pages/payment/PaymentPage";

function renderAtToken(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/odeme/${token}`]}>
      <Routes>
        <Route path="/odeme/:token" element={<PaymentPage />} />
      </Routes>
    </MemoryRouter>
  );
}

/**
 * Ödeme ekranının iki sözleşmesi:
 *  1. Kart alanları bu uygulamada HİÇ oluşturulmaz — yalnızca PayTR'nin
 *     kendi alan adındaki çerçeve gömülür.
 *  2. URL'den gelen token doğrulanmadan çerçeve adresine konmaz.
 */
describe("PaymentPage", () => {
  it("geçerli token ile PayTR'nin resmî güvenli ödeme adresini gömer", () => {
    const { container } = renderAtToken("abc123DEF456ghi");

    const iframe = container.querySelector("iframe#paytriframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(
      "https://www.paytr.com/odeme/guvenli/abc123DEF456ghi"
    );
  });

  it("kart bilgisi toplayan hiçbir alan oluşturmaz", () => {
    const { container } = renderAtToken("abc123DEF456ghi");

    // PCI kapsamı PayTR'de kalmalı: kendi DOM'umuzda input/form olmamalı.
    expect(container.querySelectorAll("input").length).toBe(0);
    expect(container.querySelectorAll("form").length).toBe(0);
  });

  it("GERÇEK PayTR token biçimini (tireli) kabul eder ve çerçeveyi açar", () => {
    // Regresyon: gerçek token "<64 hex>-<rakam>" biçiminde gelir.
    const real =
      "e5d3ba9d72f900503ae1845bfdd96c0ea17efa0b19bbeb98adf4ed0626a3fdb6-885693595";
    const { container } = renderAtToken(real);

    const iframe = container.querySelector("iframe#paytriframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(
      `https://www.paytr.com/odeme/guvenli/${real}`
    );
  });

  it("geçersiz token ile çerçeve açmaz, bilgilendirme gösterir", () => {
    const { container } = renderAtToken("kisa");

    expect(container.querySelector("iframe")).toBeNull();
    screen.getByText("Ödeme oturumu bulunamadı");
  });

  it("token yerine zararlı bir değer geldiğinde çerçeve açmaz", () => {
    const { container } = renderAtToken(encodeURIComponent("javascript:alert(1)"));

    expect(container.querySelector("iframe")).toBeNull();
    screen.getByText("Ödeme oturumu bulunamadı");
  });
});
