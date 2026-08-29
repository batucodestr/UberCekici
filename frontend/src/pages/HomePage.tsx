import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Clock, MapPinned, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Footer } from "@/components/layout/Footer";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import { fetchServiceTypes } from "@/services/requests";

const VEHICLES = [
  { name: "Otomobil", icon: "🚗" },
  { name: "Motosiklet", icon: "🏍️" },
  { name: "SUV", icon: "🚙" },
  { name: "Kamyonet", icon: "🛻" },
  { name: "Kamyon", icon: "🚚" },
  { name: "Otobüs", icon: "🚌" },
  { name: "Traktör", icon: "🚜" },
  { name: "Kapalı Kasa", icon: "🚐" },
];

const TRUST_POINTS = [
  {
    icon: MapPinned,
    title: "Türkiye Geneli",
    description: "Tüm il ve ilçelerde hizmet ağımızla yanınızdayız.",
  },
  {
    icon: ShieldCheck,
    title: "Lisanslı Operatörler",
    description: "Yalnızca deneyimli ve lisanslı çekici operatörleriyle çalışıyoruz.",
  },
  {
    icon: Clock,
    title: "Ortalama 20-30 Dakika",
    description: "Talebiniz alındığı anda en yakın operatör yola çıkar.",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["service-types"],
    queryFn: fetchServiceTypes,
  });

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar dark />

      <section className="bg-zinc-950 px-4 py-24 text-center text-white">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl"
        >
          Yolda kaldığınız anda, <span className="text-zinc-300">tek dokunuşla</span> yanınızdayız
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-4 max-w-xl text-lg text-zinc-400"
        >
          Anlık fiyat, canlı takip ve güvenilir sürücülerle 7/24 çekici ve yol yardım hizmeti.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex justify-center gap-3"
        >
          <button
            onClick={() => navigate("/giris")}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-semibold text-zinc-950 shadow-soft transition hover:bg-zinc-200"
          >
            Hemen Çekici Çağır
          </button>
          <button
            onClick={() => navigate("/giris")}
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            Sürücü Ol
          </button>
        </motion.div>
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

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-zinc-900">
          Her araç tipi için hızlı çözüm
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {VEHICLES.map((vehicle, index) => (
            <motion.div
              key={vehicle.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -6, scale: 1.03 }}
              className="card flex flex-col items-center gap-2 text-center"
            >
              <span className="text-4xl">{vehicle.icon}</span>
              <span className="font-semibold text-zinc-700">{vehicle.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-zinc-50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-zinc-900">Hizmetlerimiz</h2>
            <Link to="/hizmetlerimiz" className="text-sm font-semibold text-primary-600 hover:underline">
              Tümünü Gör →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {serviceTypes.slice(0, 9).map((service) => {
              const Icon = SERVICE_CATALOG[service.name]?.icon;
              return (
                <div key={service.id} className="card">
                  {Icon && (
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                  )}
                  <p className="font-semibold text-zinc-900">{service.display_name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-zinc-950 p-10 text-center text-white sm:flex-row sm:text-left">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Şirketiniz için çekici mi arıyorsunuz?</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Taleplerinizi tek panelden açın, aylık cari hesaba yazdırın.
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
