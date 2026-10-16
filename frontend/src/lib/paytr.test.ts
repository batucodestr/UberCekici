import { describe, expect, it } from "vitest";

import {
  buildPaytrIframeSrc,
  isValidPaytrToken,
  parseMerchantOid,
  PAYTR_ORIGIN,
} from "@/lib/paytr";

/** Gerçek PayTR test ortamından dönen token biçimi: <64 hex>-<rakam> */
const REAL_PAYTR_TOKEN =
  "e5d3ba9d72f900503ae1845bfdd96c0ea17efa0b19bbeb98adf4ed0626a3fdb6-885693595";

describe("isValidPaytrToken", () => {
  it("accepts a plain alphanumeric token", () => {
    expect(isValidPaytrToken("abc123DEF456ghi789")).toBe(true);
  });

  it("accepts the real PayTR token format (hyphen-separated)", () => {
    // Regresyon: tireyi reddeden dar kural yüzünden gerçek ödeme ekranı
    // "Ödeme oturumu bulunamadı" gösteriyordu.
    expect(isValidPaytrToken(REAL_PAYTR_TOKEN)).toBe(true);
  });

  it("rejects empty, short and non-alphanumeric values", () => {
    expect(isValidPaytrToken(undefined)).toBe(false);
    expect(isValidPaytrToken("")).toBe(false);
    expect(isValidPaytrToken("short")).toBe(false);
    expect(isValidPaytrToken("abc/../../etc/passwd")).toBe(false);
    expect(isValidPaytrToken("javascript:alert(1)")).toBe(false);
    expect(isValidPaytrToken("token with space")).toBe(false);
  });
});

describe("buildPaytrIframeSrc", () => {
  it("builds the official secure payment URL", () => {
    expect(buildPaytrIframeSrc("abc123DEF456")).toBe(
      `${PAYTR_ORIGIN}/odeme/guvenli/abc123DEF456`
    );
  });

  it("builds the URL for a real PayTR token", () => {
    expect(buildPaytrIframeSrc(REAL_PAYTR_TOKEN)).toBe(
      `${PAYTR_ORIGIN}/odeme/guvenli/${REAL_PAYTR_TOKEN}`
    );
  });

  it("refuses to build a URL from an untrusted token", () => {
    // URL'den gelen değer doğrulanmadan iFrame adresine konmaz.
    expect(() => buildPaytrIframeSrc("https://kotu.site/#")).toThrow();
    expect(() => buildPaytrIframeSrc("../../etc/passwd")).toThrow();
    expect(() => buildPaytrIframeSrc("javascript:alert(1)")).toThrow();
  });
});

describe("parseMerchantOid", () => {
  it("reads an alphanumeric order number from the query string", () => {
    expect(parseMerchantOid("?oid=SRabc123")).toBe("SRabc123");
  });

  it("ignores a missing or malformed order number", () => {
    expect(parseMerchantOid("")).toBeNull();
    expect(parseMerchantOid("?oid=")).toBeNull();
    expect(parseMerchantOid("?oid=SR-123/../x")).toBeNull();
  });
});
