import { motion } from "framer-motion";
import { Lock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { CompanyFacts } from "@/components/legal/CompanyFacts";
import { PaymentBadges } from "@/components/legal/PaymentBadges";
import { ADMIN_HOME } from "@/components/ProtectedRoute";
import { COMPANY } from "@/lib/company";
import { LEGAL_LINKS } from "@/lib/legalLinks";
import { loginUser, logoutUser } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";


export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ username: "", password: "" });
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  // Panelde yalnızca yönetici oturumu geçerli; eski bir müşteri/sürücü
  // oturumu tarayıcıda kalmışsa temizlenir.
  useEffect(() => {
    if (user && user.role !== "admin") {
      logout();
    }
  }, [user, logout]);

  if (user?.role === "admin") {
    return <Navigate to={ADMIN_HOME} replace />;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const auth = await loginUser(form.username, form.password);
      if (auth.role !== "admin") {
        // Hesap geçerli ama panel yetkisi yok: oturumu hemen kapat.
        await logoutUser().catch(() => {});
        setError(
          "Bu panele yalnızca yönetici hesapları giriş yapabilir. Müşteri ve sürücü işlemleri mobil uygulama üzerinden yürütülür."
        );
        return;
      }
      setAuth(auth);
      navigate(ADMIN_HOME, { replace: true });
    } catch {
      setError("Kullanıcı adı veya şifre hatalı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur"
        >
          <div className="mb-7 text-center">
            <img
              src="/logo.jpeg"
              alt="Kurtarıcım"
              className="mx-auto h-14 w-14 rounded-2xl object-cover"
            />
            <h1 className="mt-4 text-2xl font-bold">Kurtarıcım</h1>
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Yönetici Kontrol Paneli
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              className="input border-white/10 bg-white/5 text-white placeholder:text-zinc-400 focus:border-white/30 focus:ring-0"
              placeholder="Kullanıcı adı"
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
            <input
              className="input border-white/10 bg-white/5 text-white placeholder:text-zinc-400 focus:border-white/30 focus:ring-0"
              type="password"
              placeholder="Şifre"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !bg-white !text-zinc-950 hover:!bg-zinc-200"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>

          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-zinc-400">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Bu alan şirket içi kullanıma özeldir. Müşteri çağrıları, sürücü işlemleri ve
            talep takibi mobil uygulama üzerinden yürütülür.
          </p>
        </motion.div>
      </div>

      {/* iyzico şartı: ödeme logoları ve firma künyesi giriş yapılmadan da görünür. */}
      <footer className="border-t border-white/10 px-4 py-8 text-xs text-zinc-500">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="hover:text-zinc-300">
                {link.short}
              </Link>
            ))}
          </div>

          <div className="flex justify-center border-t border-white/10 pt-6">
            <PaymentBadges tone="dark" className="!items-center" />
          </div>

          <div className="border-t border-white/10 pt-6">
            <CompanyFacts variant="grid" tone="dark" />
          </div>

          <p className="border-t border-white/10 pt-5 text-center">
            © {new Date().getFullYear()} {COMPANY.brandName}. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
}
