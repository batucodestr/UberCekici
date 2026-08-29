import { AxiosError } from "axios";
import { motion } from "framer-motion";
import { Truck, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Footer } from "@/components/layout/Footer";
import { roleHome } from "@/components/ProtectedRoute";
import { loginUser, registerUser } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/types";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object") {
      const firstValue = Object.values(detail)[0];
      if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
        return firstValue[0];
      }
    }
  }
  return fallback;
}

type Tab = "login" | "register";
type SelectableRole = Exclude<Role, "admin">;

const ROLE_CARDS: { role: SelectableRole; label: string; icon: React.ReactNode }[] = [
  { role: "customer", label: "Müşteri", icon: <UserIcon className="h-6 w-6" /> },
  { role: "driver", label: "Çekici", icon: <Truck className="h-6 w-6" /> },
];

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [selectedRole, setSelectedRole] = useState<SelectableRole>("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    phone_number: "",
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const auth = await loginUser(loginForm.username, loginForm.password);
      setAuth(auth);
      navigate(roleHome(auth.role));
    } catch {
      setError("Kullanıcı adı veya şifre hatalı.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerUser({
        ...registerForm,
        role: selectedRole,
      });
      const auth = await loginUser(registerForm.username, registerForm.password);
      setAuth(auth);
      navigate(roleHome(auth.role));
    } catch (err) {
      setError(extractErrorMessage(err, "Kayıt oluşturulamadı. Bilgilerinizi kontrol edin."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary-50 to-white">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-3xl border border-zinc-100 bg-white p-8 shadow-soft"
        >
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-zinc-900">Uber Çekici</h1>
            <p className="mt-1 text-sm text-zinc-500">7/24 çekici ve yol yardım platformu</p>
          </div>

          <div className="mb-6 flex rounded-2xl bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                tab === "login" ? "bg-white shadow-card text-zinc-900" : "text-zinc-500"
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                tab === "register" ? "bg-white shadow-card text-zinc-900" : "text-zinc-500"
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          {tab === "register" && (
            <div className="mb-6 grid grid-cols-2 gap-2">
              {ROLE_CARDS.map(({ role, label, icon }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-medium transition ${
                    selectedRole === role
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-zinc-200 text-zinc-500 hover:border-primary-300"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                className="input"
                placeholder="Kullanıcı adı"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                required
              />
              <input
                className="input"
                type="password"
                placeholder="Şifre"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
              />
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <input
                className="input"
                placeholder="Kullanıcı adı"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                required
              />
              <input
                className="input"
                type="email"
                placeholder="E-posta"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                required
              />
              <input
                className="input"
                placeholder="Telefon numarası"
                value={registerForm.phone_number}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, phone_number: e.target.value })
                }
              />
              <input
                className="input"
                type="password"
                placeholder="Şifre"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                required
              />
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Kaydediliyor..." : "Kayıt Ol"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
