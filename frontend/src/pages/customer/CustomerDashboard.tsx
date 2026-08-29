import { useQuery } from "@tanstack/react-query";

import { Navbar } from "@/components/layout/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchMyRequests } from "@/services/requests";

export default function CustomerDashboard() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my-requests"],
    queryFn: fetchMyRequests,
  });

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      <Navbar title="Geçmişim" />

      <div className="mx-auto max-w-2xl px-4 py-6">
        {isLoading && <p className="text-sm text-zinc-400">Yükleniyor...</p>}
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-800">
                  {req.vehicle_type.name} · {req.service_type.display_name}
                </p>
                <p className="text-xs text-zinc-400">
                  {new Date(req.created_at).toLocaleString("tr-TR")}
                </p>
              </div>
              <div className="text-right">
                <StatusBadge status={req.status} />
                <p className="mt-1 text-sm font-semibold text-zinc-700">{req.price} ₺</p>
              </div>
            </div>
          ))}
          {!isLoading && requests.length === 0 && (
            <p className="text-sm text-zinc-400">Henüz bir talebiniz bulunmuyor.</p>
          )}
        </div>
      </div>
    </div>
  );
}
