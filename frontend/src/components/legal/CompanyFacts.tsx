import { COMPANY_FACTS } from "@/lib/company";

/**
 * iyzico şartı: resmi belgelerdeki firma künyesi sitede yayınlanmalı.
 * Aynı liste footer'da, giriş ekranında, panelde ve yasal metinlerin
 * "Satıcı Bilgileri" bölümlerinde kullanılır.
 */
export function CompanyFacts({
  variant = "list",
  tone = "light",
  className = "",
}: {
  /** "list" yasal metin içinde, "grid" footer gibi dar alanlarda. */
  variant?: "list" | "grid";
  tone?: "light" | "dark";
  className?: string;
}) {
  const isDark = tone === "dark";
  const isGrid = variant === "grid";

  return (
    <dl
      className={`${
        isGrid
          ? "grid gap-x-6 gap-y-1.5 text-[11px] sm:grid-cols-2"
          : "space-y-1.5 text-sm"
      } ${isDark ? "text-zinc-500" : "text-zinc-500"} ${className}`}
    >
      {COMPANY_FACTS.map((fact) => (
        <div
          key={fact.label}
          className={isGrid ? "flex gap-1.5" : "flex flex-col gap-0.5 sm:flex-row sm:gap-2"}
        >
          <dt
            className={`shrink-0 font-semibold ${isDark ? "text-zinc-400" : "text-zinc-700"} ${
              isGrid ? "" : "min-w-[150px]"
            }`}
          >
            {fact.label}
            {isGrid ? ":" : ""}
          </dt>
          <dd className="min-w-0">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
