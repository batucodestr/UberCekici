import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, User as UserIcon } from "lucide-react";
import { useEffect } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { TrackingMap } from "@/components/TrackingMap";
import { getCurrentLocation } from "@/components/LocationPicker";
import { useDriverRequestSocket } from "@/hooks/useDriverRequestSocket";
import {
  acceptRequest,
  fetchMyRequests,
  fetchOpenRequests,
  updateRequestStatus,
} from "@/services/requests";
import { fetchMyDriverProfile, toggleOnline, updateDriverLocation } from "@/services/driver";
import type { RequestStatus } from "@/types";

const NEXT_STATUS: Partial<Record<RequestStatus, RequestStatus>> = {
  driver_found: "en_route",
  en_route: "arrived",
  arrived: "completed",
};

const NEXT_LABEL: Partial<Record<RequestStatus, string>> = {
  driver_found: "Yola Çıktım",
  en_route: "Vardım",
  arrived: "İşi Tamamla",
};

export default function DriverDashboard() {
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["driver-profile"],
    queryFn: fetchMyDriverProfile,
  });

  const { data: myJobs = [] } = useQuery({
    queryKey: ["driver-jobs"],
    queryFn: fetchMyRequests,
    refetchInterval: 8000,
  });

  const { data: openJobs = [] } = useQuery({
    queryKey: ["driver-open-jobs"],
    queryFn: fetchOpenRequests,
    refetchInterval: 8000,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleOnline,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["driver-profile"] }),
  });

  const acceptMutation = useMutation({
    mutationFn: acceptRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["driver-open-jobs"] });
    },
  });

  const { incomingRequest, dismiss } = useDriverRequestSocket(Boolean(profile?.is_online));

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RequestStatus }) =>
      updateRequestStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["driver-jobs"] }),
  });

  useEffect(() => {
    if (!profile?.is_online) return;
    const interval = setInterval(async () => {
      try {
        const loc = await getCurrentLocation();
        await updateDriverLocation(loc.lat, loc.lng);
      } catch {
        // konum izni verilmediyse sessizce yoksay
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [profile?.is_online]);

  const activeJob = myJobs.find((j) =>
    ["driver_found", "en_route", "arrived"].includes(j.status)
  );
  const availableJobs = openJobs;

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      <Navbar title="Sürücü Paneli" />

      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="card mb-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-zinc-800">
              {profile?.is_online ? "Çevrimiçisiniz" : "Çevrimdışısınız"}
            </p>
            <p className="text-xs text-zinc-400">Kazanç: {profile?.total_earnings ?? 0} ₺</p>
          </div>
          <button
            onClick={() => toggleMutation.mutate()}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              profile?.is_online
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "bg-primary-500 text-white hover:bg-primary-600"
            }`}
          >
            {profile?.is_online ? "Çevrimdışı Ol" : "Çevrimiçi Ol"}
          </button>
        </div>

        {activeJob && (
          <div className="card mb-6 border-primary-200 bg-primary-50">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-primary-700">Aktif İş #{activeJob.id}</p>
              <StatusBadge status={activeJob.status} />
            </div>

            <div className="mb-3 overflow-hidden rounded-2xl">
              <TrackingMap
                pickup={{ lat: Number(activeJob.pickup_lat), lng: Number(activeJob.pickup_lng) }}
                dropoff={{
                  lat: Number(activeJob.dropoff_lat),
                  lng: Number(activeJob.dropoff_lng),
                }}
                driverLocation={null}
              />
            </div>

            <div className="mb-3 space-y-1 rounded-xl bg-white p-3">
              <p className="text-xs text-zinc-400">Alış Noktası</p>
              <p className="text-sm text-zinc-700">{activeJob.pickup_address}</p>
              <p className="mt-2 text-xs text-zinc-400">Varış Noktası</p>
              <p className="text-sm text-zinc-700">{activeJob.dropoff_address}</p>
            </div>

            <div className="mb-3 flex items-center justify-between rounded-xl bg-white p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100">
                  <UserIcon className="h-4 w-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">
                    {activeJob.contact_name || activeJob.customer.first_name || activeJob.customer.username}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {activeJob.vehicle_type.name} · {activeJob.service_type.display_name}
                  </p>
                </div>
              </div>
              {activeJob.contact_phone && (
                <a
                  href={`tel:${activeJob.contact_phone}`}
                  className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-600"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {activeJob.contact_phone}
                </a>
              )}
            </div>

            {activeJob.note && (
              <p className="mb-3 rounded-xl bg-white p-3 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400">Not: </span>
                {activeJob.note}
              </p>
            )}

            <p className="mb-3 text-right text-sm font-semibold text-zinc-700">
              {activeJob.price} ₺
            </p>

            {NEXT_STATUS[activeJob.status] && (
              <button
                onClick={() =>
                  statusMutation.mutate({ id: activeJob.id, status: NEXT_STATUS[activeJob.status]! })
                }
                className="btn-primary w-full"
              >
                {NEXT_LABEL[activeJob.status]}
              </button>
            )}
          </div>
        )}

        <h2 className="mb-3 text-sm font-semibold text-zinc-500">Bekleyen Talepler</h2>
        <div className="space-y-3">
          {availableJobs.map((job) => (
            <div key={job.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-800">
                  {job.vehicle_type.name} · {job.service_type.display_name}
                </p>
                <p className="text-xs text-zinc-400">{job.pickup_address}</p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-sm font-semibold text-zinc-700">{job.price} ₺</p>
                <button
                  onClick={() => acceptMutation.mutate(job.id)}
                  className="rounded-xl bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600"
                >
                  Kabul Et
                </button>
              </div>
            </div>
          ))}
          {availableJobs.length === 0 && (
            <p className="text-sm text-zinc-400">Şu anda bekleyen talep yok.</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {incomingRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                Yeni Talep
              </p>
              <h3 className="mt-1 text-lg font-bold text-zinc-900">
                {incomingRequest.vehicle_type.name} · {incomingRequest.service_type.display_name}
              </h3>
              <div className="mt-3 space-y-1.5 text-sm text-zinc-600">
                <p>
                  Mesafe:{" "}
                  <span className="font-semibold text-zinc-800">
                    {incomingRequest.distance_to_driver_km} km
                  </span>
                </p>
                <p>
                  Ücret:{" "}
                  <span className="font-semibold text-zinc-800">
                    {incomingRequest.price} ₺
                  </span>
                </p>
                <p>
                  Lokasyon:{" "}
                  <span className="font-semibold text-zinc-800">
                    {incomingRequest.pickup_address}
                  </span>
                </p>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={dismiss}
                  className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:border-red-300 hover:text-red-600"
                >
                  Reddet
                </button>
                <button
                  onClick={() => {
                    acceptMutation.mutate(incomingRequest.id);
                    dismiss();
                  }}
                  className="btn-primary flex-1"
                >
                  Kabul Et
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
