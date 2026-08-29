import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { createPriceRule, fetchPriceRules, updatePriceRule } from "@/services/admin";
import type { PriceRule } from "@/types";

function RuleRow({ rule }: { rule: PriceRule }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(rule);

  const mutation = useMutation({
    mutationFn: (payload: Partial<PriceRule>) => updatePriceRule(rule.id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["price-rules"] }),
  });

  function field(key: keyof PriceRule) {
    return (
      <input
        className="input !py-1.5 text-sm"
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        onBlur={() => mutation.mutate({ [key]: form[key] })}
      />
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
        motorunda Redis önbelleği otomatik güncellenir.
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
