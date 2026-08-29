import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { Footer } from "@/components/layout/Footer";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import { fetchServiceTypes } from "@/services/requests";

export default function HizmetlerimizPage() {
  const navigate = useNavigate();
  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["service-types"],
    queryFn: fetchServiceTypes,
  });

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <section className="bg-zinc-950 px-4 py-16 text-center text-white">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Hizmetlerimiz</h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-400">
          Türkiye'nin dört bir yanında, lisanslı ve deneyimli operatörlerle 7/24 yol yardımı ve
          çekici hizmeti sunuyoruz.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {serviceTypes.map((service, index) => {
            const meta = SERVICE_CATALOG[service.name];
            const Icon = meta?.icon;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="card"
              >
                {Icon && (
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                )}
                <h3 className="font-bold text-zinc-900">{service.display_name}</h3>
                <p className="mt-1.5 text-sm text-zinc-500">{meta?.description}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 rounded-3xl bg-zinc-50 p-8 text-center">
          <h2 className="text-xl font-bold text-zinc-900">Aracınızın tipi ne olursa olsun</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">
            Otomobilden ağır vasıtaya, motosikletten traktöre kadar her araç tipi için uygun
            ekipmana sahip operatörlerle çalışıyoruz.
          </p>
          <button onClick={() => navigate("/giris")} className="btn-primary mt-5">
            Hemen Çekici Çağır
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
