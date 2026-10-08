import { motion } from "framer-motion";
import {
  BatteryCharging,
  Building2,
  CircleGauge,
  Clock,
  Layers,
  LifeBuoy,
  MapPinned,
  Phone,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Footer } from "@/components/layout/Footer";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { COMPANY } from "@/lib/company";
import { CITY_TARIFFS, SERVICES, TARIFF, VEHICLE_MULTIPLIERS } from "@/lib/tariff";

/** Hizmet kartlarının ikonları — isimler `@/lib/tariff` içindeki SERVICES ile eşleşir. */
const SERVICE_ICONS: Record<string, typeof Truck> = {
  Çekici: Truck,
  "Yol Yardım": Wrench,
  Akü: BatteryCharging,
  Lastik: CircleGauge,
  "Çoklu Araç Çekimi": Layers,
  Kurtarma: LifeBuoy,
};

const CITY_LIST = CITY_TARIFFS.map((t) => t.city).join(", ");

/** Tanıtım metinleri, panelde tanımlı gerçek verilerle tutarlı tutulur. */
const TRUST_POINTS = [
  {
    icon: MapPinned,
    title: `${CITY_TARIFFS.length} şehirde hizmet`,
    description: `${CITY_LIST} illerinde çekici ve yol yardımı taleplerinizi karşılıyoruz.`,
  },
  {
    icon: Clock,
    title: "7 gün 24 saat",
    description: `Talepler gece gündüz karşılanır. ${TARIFF.nightStartHour}:00–0${TARIFF.nightEndHour}:00 arasında gece tarifesi uygulanır.`,
  },
  {
    icon: ShieldCheck,
    title: "Şeffaf fiyat",
    description:
      "Ücret, talebi onaylamadan önce net tutar olarak gösterilir. Tarifemiz sitede açıkça yayınlanır.",
  },
];

export default function HomePage() {
  const izmir = CITY_TARIFFS[0];

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar dark />

      <section className="relative isolate overflow-hidden bg-zinc-950 px-4 py-28 text-white sm:py-36">
        {/* Dekoratif arka plan; metin kontrastı üstteki gradyanla garanti edilir. */}
        <img
          src="/img/hero.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-right"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-zinc-950/55"
        />
        <div className="mx-auto max-w-6xl text-center sm:text-left">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
        >
          Yolda kaldığınızda <span className="text-zinc-300">yanınızdayız</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-5 max-w-xl text-lg text-zinc-300"
        >
          {COMPANY.brandName} ile çekici, kurtarma ve yol yardımı hizmeti; şeffaf fiyat ve
          mobil uygulama üzerinden canlı takip.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-9 flex flex-wrap justify-center gap-3 sm:justify-start"
        >
          <a
            href={`tel:${COMPANY.phoneHref}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-zinc-950 shadow-soft transition hover:bg-zinc-200"
          >
            <Phone className="h-4 w-4" />
            Hemen Ara: {COMPANY.phone}
          </a>
          <Link
            to="/hizmetlerimiz"
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            Hizmetler ve Fiyatlar
          </Link>
        </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-5 sm:grid-cols-3">
          {TRUST_POINTS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900">{title}</p>
                <p className="text-sm text-zinc-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-zinc-50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold text-zinc-900">Hizmetlerimiz</h2>
            <Link
              to="/hizmetlerimiz"
              className="text-sm font-semibold text-primary-600 hover:underline"
            >
              Tarifeyi Gör →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => {
              const Icon = SERVICE_ICONS[service.name];
              return (
                <div key={service.name} className="card">
                  {Icon && (
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                  )}
                  <p className="font-semibold text-zinc-900">{service.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-2 text-center text-2xl font-bold text-zinc-900">
          Her araç tipi için çözüm
        </h2>
        <p className="mb-8 text-center text-sm text-zinc-500">
          Ücret, araç tipine göre belirlenen katsayıyla hesaplanır.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {VEHICLE_MULTIPLIERS.map((vehicle) => (
            <div
              key={vehicle.name}
              className="card flex flex-col items-center gap-1 text-center transition hover:-translate-y-1.5"
            >
              <span className="font-semibold text-zinc-700">{vehicle.name}</span>
              <span className="text-xs text-zinc-400">×{vehicle.multiplier.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* iyzico kriteri: fiyat bilgisi anasayfadan da görünür olmalı. */}
      <section className="bg-zinc-50 px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-zinc-900">Fiyatlarımız şeffaf</h2>
          <p className="mt-2 text-sm text-zinc-500">
            {izmir.city} için açılış ücreti <strong>{izmir.baseFee} TL</strong>, kilometre
            ücreti <strong>{izmir.pricePerKm} TL</strong>. Tüm şehirlerin tarifesi ve ücretin
            nasıl hesaplandığı ayrıntılı olarak yayınlanmaktadır.
          </p>
          <Link
            to="/hizmetlerimiz"
            className="mt-6 inline-flex rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Tüm Tarifeyi İncele
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="relative isolate flex flex-col items-center gap-6 overflow-hidden rounded-3xl bg-zinc-950 p-10 text-center text-white sm:flex-row sm:text-left">
          <img
            src="/img/cekici.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 h-full w-full object-cover"
            loading="lazy"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-r from-zinc-950 via-zinc-950/92 to-zinc-950/70"
          />
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Şirketiniz için çekici mi arıyorsunuz?</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Filo ve kurumsal müşteriler için anlaşmalı çalışma koşulları sunuyoruz.
            </p>
          </div>
          <Link
            to="/kurumsal-cozumler"
            className="shrink-0 rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
          >
            Kurumsal Çözümleri İncele
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
