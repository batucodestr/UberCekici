import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Star } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";

import { Navbar } from "@/components/layout/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { TrackingMap } from "@/components/TrackingMap";
import { useRequestTracking } from "@/hooks/useRequestTracking";
import { fetchRequestDetail, rateRequest } from "@/services/requests";
import type { RequestStatus } from "@/types";

const TIMELINE: RequestStatus[] = [
  "created",
  "searching",
  "driver_found",
  "en_route",
  "arrived",
  "completed",
];

const TIMELINE_LABELS: Record<RequestStatus, string> = {
  created: "Talep Alındı",
  searching: "Operatör Aranıyor",
  driver_found: "Sürücü Bulundu",
  en_route: "Yolda",
  arrived: "Geldi",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

function DriverRatingCard({ requestId }: { requestId: number }) {
  const queryClient = useQueryClient();
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () => rateRequest(requestId, stars, comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["request", requestId] }),
  });

  return (
    <div className="card mb-6">
      <p className="font-semibold text-zinc-800">Sürücünüzü değerlendirin</p>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStars(value)}
            onMouseEnter={() => setHovered(value)}
            onMouseLeave={() => setHovered(0)}
          >
            <Star
              className={`h-8 w-8 transition ${
                value <= (hovered || stars)
                  ? "fill-amber-400 text-amber-400"
                  : "text-zinc-200"
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        className="input mt-3"
        rows={2}
        placeholder="Yorumunuz (opsiyonel)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button
        onClick={() => mutation.mutate()}
        disabled={stars === 0 || mutation.isPending}
        className="btn-primary mt-3 w-full"
      >
        {mutation.isPending ? "Gönderiliyor..." : "Değerlendirmeyi Gönder"}
      </button>
    </div>
  );
}

export default function TrackingPage() {
  const { id } = useParams();
  const requestId = Number(id);

  const { data: initial } = useQuery({
    queryKey: ["request", requestId],
    queryFn: () => fetchRequestDetail(requestId),
    enabled: !Number.isNaN(requestId),
  });

  const { request: live, driverLocation } = useRequestTracking(requestId, initial);
  const request = live ?? initial;

  if (!request) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Navbar title="Canlı Takip" />
        <p className="p-6 text-sm text-zinc-400">Yükleniyor...</p>
      </div>
    );
  }

  const currentIndex = TIMELINE.indexOf(request.status);

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      <Navbar title={`Talep #${request.id}`} />

      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="card mb-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-zinc-800">
              {request.vehicle_type.name} · {request.service_type.display_name}
            </p>
            <p className="text-sm text-zinc-500">{request.price} ₺</p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {request.driver && (
          <div className="card mb-6">
            <p className="text-xs text-zinc-400">Sürücünüz</p>
            <p className="font-semibold text-zinc-800">
              {request.driver.first_name || request.driver.username}
            </p>
            <p className="text-sm text-zinc-500">{request.driver.phone_number}</p>
          </div>
        )}

        <div className="card mb-6 !p-0 overflow-hidden">
          <TrackingMap
            pickup={{ lat: Number(request.pickup_lat), lng: Number(request.pickup_lng) }}
            dropoff={{ lat: Number(request.dropoff_lat), lng: Number(request.dropoff_lng) }}
            driverLocation={driverLocation}
          />
        </div>

        {request.status === "completed" && request.driver && (
          request.rating ? (
            <div className="card mb-6">
              <p className="font-semibold text-zinc-800">Değerlendirmeniz</p>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={`h-5 w-5 ${
                      value <= request.rating! ? "fill-amber-400 text-amber-400" : "text-zinc-200"
                    }`}
                  />
                ))}
              </div>
              {request.rating_comment && (
                <p className="mt-2 text-sm text-zinc-500">{request.rating_comment}</p>
              )}
            </div>
          ) : (
            <DriverRatingCard requestId={request.id} />
          )
        )}

        <div className="card">
          <ol className="space-y-4">
            {TIMELINE.map((status, index) => {
              const done = index <= currentIndex && request.status !== "cancelled";
              return (
                <li key={status} className="flex items-center gap-3">
                  <CheckCircle2
                    className={`h-5 w-5 ${done ? "text-green-500" : "text-zinc-300"}`}
                  />
                  <span className={done ? "font-medium text-zinc-800" : "text-zinc-400"}>
                    {TIMELINE_LABELS[status]}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
