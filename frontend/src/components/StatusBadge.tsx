import type { RequestStatus } from "@/types";

const STATUS_LABELS: Record<RequestStatus, string> = {
  created: "Talep Alındı",
  searching: "Operatör Aranıyor",
  driver_found: "Sürücü Bulundu",
  en_route: "Yolda",
  arrived: "Geldi",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

const STATUS_COLORS: Record<RequestStatus, string> = {
  created: "bg-zinc-100 text-zinc-600",
  searching: "bg-amber-100 text-amber-700",
  driver_found: "bg-blue-100 text-blue-700",
  en_route: "bg-blue-100 text-blue-700",
  arrived: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
