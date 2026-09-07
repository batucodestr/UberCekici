import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Navbar } from "@/components/layout/Navbar";
import { getCurrentLocation, LocationPicker, type LatLng } from "@/components/LocationPicker";
import { estimateDurationMinutes, haversineDistanceKm } from "@/lib/geo";
import { fetchNearbyDrivers } from "@/services/driver";
import {
  createServiceRequest,
  fetchServiceTypes,
  fetchVehicleTypes,
  getQuote,
} from "@/services/requests";
import type { Quote } from "@/types";

const STEPS = ["Araç Tipi", "Konum", "Hizmet", "Fiyat", "Bilgiler"] as const;

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [vehicleTypeId, setVehicleTypeId] = useState<number | null>(null);
  const [serviceTypeId, setServiceTypeId] = useState<number | null>(null);
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [activePoint, setActivePoint] = useState<"pickup" | "dropoff">("pickup");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ contact_name: "", contact_phone: "", note: "" });

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ["vehicle-types"],
    queryFn: fetchVehicleTypes,
  });
  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["service-types"],
    queryFn: fetchServiceTypes,
  });
  const { data: nearbyDrivers = [] } = useQuery({
    queryKey: ["nearby-drivers"],
    queryFn: fetchNearbyDrivers,
    refetchInterval: 10000,
  });

  const distanceKm = useMemo(() => {
    if (!pickup || !dropoff) return 0;
    return haversineDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
  }, [pickup, dropoff]);

  const durationMinutes = useMemo(() => estimateDurationMinutes(distanceKm), [distanceKm]);

  async function handleUseCurrentLocation() {
    try {
      const loc = await getCurrentLocation();
      setPickup(loc);
      setActivePoint("dropoff");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleFetchQuote() {
    if (!vehicleTypeId || !serviceTypeId || !pickup || !dropoff) return;
    setQuoteLoading(true);
    setError("");
    try {
      const result = await getQuote({
        vehicle_type_id: vehicleTypeId,
        service_type_id: serviceTypeId,
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
      });
      setQuote(result);
      setStep(3);
    } catch {
      setError("Fiyat hesaplanamadı. Lütfen tekrar deneyin.");
    } finally {
      setQuoteLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleTypeId || !serviceTypeId || !pickup || !dropoff || !quote) return;
    setSubmitting(true);
    setError("");
    try {
      const request = await createServiceRequest({
        vehicle_type: vehicleTypeId,
        service_type: serviceTypeId,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        ...form,
      });
      navigate(`/musteri/takip/${request.id}`);
    } catch {
      setError("Talep oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      <Navbar title="Yeni Talep Oluştur" />

      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex justify-between">
          {STEPS.map((label, index) => (
            <div key={label} className="flex flex-1 flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  index <= step ? "bg-primary-500 text-white" : "bg-zinc-200 text-zinc-500"
                }`}
              >
                {index + 1}
              </div>
              <span className="mt-1 text-center text-[11px] text-zinc-500">{label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
        )}

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          {step === 0 && (
            <div>
              <h2 className="mb-4 font-semibold text-zinc-800">Aracınızın tipini seçin</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {vehicleTypes.map((vt) => (
                  <button
                    key={vt.id}
                    onClick={() => setVehicleTypeId(vt.id)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border p-4 text-sm font-medium transition ${
                      vehicleTypeId === vt.id
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-zinc-200 text-zinc-600 hover:border-primary-300"
                    }`}
                  >
                    <span className="text-2xl">{vt.icon}</span>
                    {vt.name}
                  </button>
                ))}
              </div>
              <button
                disabled={!vehicleTypeId}
                onClick={() => setStep(1)}
                className="btn-primary mt-6 w-full"
              >
                Devam Et
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-zinc-800">Aracınız nerede?</h2>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-sm font-medium text-primary-600 hover:underline"
                >
                  Mevcut konumumu kullan
                </button>
              </div>
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => setActivePoint("pickup")}
                  className={`btn-outline flex-1 !py-2 text-sm ${
                    activePoint === "pickup" ? "border-primary-500 text-primary-600" : ""
                  }`}
                >
                  Başlangıç Noktası
                </button>
                <button
                  onClick={() => setActivePoint("dropoff")}
                  className={`btn-outline flex-1 !py-2 text-sm ${
                    activePoint === "dropoff" ? "border-primary-500 text-primary-600" : ""
                  }`}
                >
                  Varış Noktası
                </button>
              </div>

              <LocationPicker
                pickup={pickup}
                dropoff={dropoff}
                activePoint={activePoint}
                onChange={(point, value) =>
                  point === "pickup" ? setPickup(value) : setDropoff(value)
                }
                nearbyDrivers={nearbyDrivers.map((d) => ({
                  lat: Number(d.latitude),
                  lng: Number(d.longitude),
                }))}
              />
              <p className="mt-2 text-xs text-zinc-400">
                Yukarıdaki kutuya adres yazarak arayabilir, haritaya tıklayarak veya işaretçiyi
                sürükleyerek de konum seçebilirsiniz. 🚚 ile işaretli noktalar yakınınızdaki
                çevrimiçi çekicilerdir.
              </p>

              <button
                disabled={!pickup || !dropoff}
                onClick={() => setStep(2)}
                className="btn-primary mt-6 w-full"
              >
                Devam Et
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="mb-4 font-semibold text-zinc-800">Hangi hizmete ihtiyacınız var?</h2>
              <div className="grid grid-cols-2 gap-3">
                {serviceTypes.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setServiceTypeId(st.id)}
                    className={`rounded-2xl border p-4 text-sm font-medium transition ${
                      serviceTypeId === st.id
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-zinc-200 text-zinc-600 hover:border-primary-300"
                    }`}
                  >
                    {st.display_name}
                  </button>
                ))}
              </div>
              <button
                disabled={!serviceTypeId || quoteLoading}
                onClick={handleFetchQuote}
                className="btn-primary mt-6 w-full"
              >
                {quoteLoading ? "Fiyat hesaplanıyor..." : "Fiyat Al"}
              </button>
            </div>
          )}

          {step === 3 && quote && (
            <div>
              <h2 className="mb-4 font-semibold text-zinc-800">Anlık Fiyat Teklifi</h2>
              <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 text-sm">
                <Row label="Mesafe" value={`${quote.distance_km} km`} />
                <Row label="Tahmini Süre" value={`${quote.eta_minutes} dk`} />
                <Row label="Açılış Ücreti" value={`${quote.base_fee.toFixed(2)} ₺`} />
                <Row label="Mesafe Ücreti" value={`${quote.distance_fee.toFixed(2)} ₺`} />
                {quote.is_night && <Row label="Gece Ücreti" value={`${quote.night_fee.toFixed(2)} ₺`} />}
                <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
                  <span>Toplam</span>
                  <span>{quote.total.toFixed(2)} ₺</span>
                </div>
              </div>
              <button onClick={() => setStep(4)} className="btn-primary mt-6 w-full">
                Talebi Oluştur
              </button>
            </div>
          )}

          {step === 4 && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <h2 className="mb-2 font-semibold text-zinc-800">İletişim Bilgileri</h2>
              <input
                className="input"
                placeholder="Ad Soyad"
                required
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
              <input
                className="input"
                placeholder="Telefon"
                required
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
              <textarea
                className="input"
                placeholder="Not (opsiyonel)"
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? "Gönderiliyor..." : "Talebi Onayla"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-zinc-600">
      <span>{label}</span>
      <span className="font-medium text-zinc-800">{value}</span>
    </div>
  );
}
