import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { createPriceRule, fetchPriceRules, updatePriceRule } from "@/services/admin";
import type { PriceRule } from "@/types";

const NUMERIC_FIELDS: (keyof PriceRule)[] = ["base_fee", "price_per_km", "night_surcharge"];

function RuleRow({ rule }: { rule: PriceRule }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(rule);
  const [errors, setErrors] = useState<Partial<Record<keyof PriceRule, string>>>({});

  const mutation = useMutation({
    mutationFn: (payload: Partial<PriceRule>) => updatePriceRule(rule.id, payload),
    onSuccess: (_data, variables) => {
      const key = Object.keys(variables)[0] as keyof PriceRule;
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      queryClient.invalidateQueries({ queryKey: ["price-rules"] });
    },
    onError: (error: unknown, variables) => {
      const key = Object.keys(variables)[0] as keyof PriceRule;
      const message =
        (error as { response?: { data?: Record<string, string[]> } })?.response?.data?.[key]?.[0] ??
        "Kaydedilemedi, lütfen değeri kontrol edin.";
      setErrors((prev) => ({ ...prev, [key]: message }));
      setForm(rule);
    },
  });

  function field(key: keyof PriceRule) {
    const isNumeric = NUMERIC_FIELDS.includes(key);
    return (
      <div>
        <input
          className={`input !py-1.5 text-sm ${errors[key] ? "border-red-500" : ""}`}
          value={form[key] as string}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          onBlur={() => {
            let value = form[key] as string;
            if (isNumeric) {
              value = value.trim().replace(",", ".");
              if (value === "" || Number.isNaN(Number(value))) {
                setErrors((prev) => ({ ...prev, [key]: "Geçerli bir sayı girin (örn. 150.00)" }));
                setForm(rule);
                return;
              }
              setForm((prev) => ({ ...prev, [key]: value }));
            }
            mutation.mutate({ [key]: value });
          }}
        />
        {errors[key] && <p className="mt-0.5 text-xs text-red-600">{errors[key]}</p>}
      </div>
    );
  }

  return (
    <tr className="border-b border-zinc-100">
      <td className="px-4 py-2">{field("city") || <span className="text-zinc-400">(genel)</span>}</td>
      <td className="px-4 py-2">{field("base_fee")}</td>
      <td className="px-4 py-2">{field("price_per_km")}</td>
      <td className="px-4 py-2">{field("night_surcharge")}</td>
      <td className="px-4 py-2 text-center">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => {
            setForm({ ...form, is_active: e.target.checked });
            mutation.mutate({ is_active: e.target.checked });
          }}
        />
      </td>
    </tr>
  );
}

export default function AdminPriceRulesPage() {
  const queryClient = useQueryClient();
  const { data: rules = [] } = useQuery({ queryKey: ["price-rules"], queryFn: fetchPriceRules });

  const createMutation = useMutation({
    mutationFn: () =>
      createPriceRule({
        city: `Yeni Şehir ${rules.length + 1}`,
        base_fee: "150.00",
        price_per_km: "12.00",
        night_surcharge: "50.00",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["price-rules"] }),
    onError: () => window.alert("Yeni kural oluşturulamadı, lütfen tekrar deneyin."),
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Fiyat Kuralları</h1>
        <button
          onClick={() => createMutation.mutate()}
          className="btn-primary flex items-center gap-1.5 !py-2 !px-4 text-sm"
        >
          <Plus className="h-4 w-4" />
          Yeni Kural
        </button>
      </div>
      <p className="mb-4 text-xs text-zinc-400">
        Bir alanı düzenleyip alandan çıktığınızda (blur) değişiklik anında kaydedilir ve fiyat
        motorunda Redis önbelleği otomatik güncellenir. Ücret alanlarına virgül (,) ile de sayı
        girebilirsiniz, otomatik olarak dönüştürülür.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Şehir</th>
              <th className="px-4 py-3">Açılış Ücreti</th>
              <th className="px-4 py-3">Km Ücreti</th>
              <th className="px-4 py-3">Gece Ek Ücreti</th>
              <th className="px-4 py-3 text-center">Aktif</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <RuleRow key={rule.id} rule={rule} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
