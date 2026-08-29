import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useState } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { changePassword, updateProfile } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";

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

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    email: user?.email ?? "",
    phone_number: user?.phone_number ?? "",
  });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ current: "", next: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const profileMutation = useMutation({
    mutationFn: () => updateProfile(profileForm),
    onSuccess: (updated) => {
      updateUser(updated);
      setProfileSuccess(true);
      setProfileError("");
      setTimeout(() => setProfileSuccess(false), 3000);
    },
    onError: (err) => {
      setProfileError(extractErrorMessage(err, "Profil güncellenemedi."));
      setProfileSuccess(false);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => changePassword(passwordForm.current, passwordForm.next),
    onSuccess: () => {
      setPasswordSuccess(true);
      setPasswordError("");
      setPasswordForm({ current: "", next: "" });
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    onError: (err) => {
      setPasswordError(extractErrorMessage(err, "Şifre değiştirilemedi."));
      setPasswordSuccess(false);
    },
  });

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      <Navbar title="Ayarlar" />

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            profileMutation.mutate();
          }}
          className="card space-y-3"
        >
          <h2 className="font-semibold text-zinc-800">Profil Bilgileri</h2>

          {profileError && (
            <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700">
              Profil güncellendi.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Ad"
              value={profileForm.first_name}
              onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Soyad"
              value={profileForm.last_name}
              onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
            />
          </div>
          <input
            className="input"
            type="email"
            placeholder="E-posta"
            value={profileForm.email}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
          />
          <input
            className="input"
            placeholder="Telefon numarası"
            value={profileForm.phone_number}
            onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
          />
          <button type="submit" disabled={profileMutation.isPending} className="btn-primary w-full">
            {profileMutation.isPending ? "Kaydediliyor..." : "Bilgileri Kaydet"}
          </button>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            passwordMutation.mutate();
          }}
          className="card space-y-3"
        >
          <h2 className="font-semibold text-zinc-800">Şifre Değiştir</h2>

          {passwordError && (
            <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700">
              Şifreniz güncellendi.
            </div>
          )}

          <input
            className="input"
            type="password"
            placeholder="Mevcut şifre"
            value={passwordForm.current}
            onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Yeni şifre"
            value={passwordForm.next}
            onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
            required
          />
          <button
            type="submit"
            disabled={passwordMutation.isPending}
            className="btn-primary w-full"
          >
            {passwordMutation.isPending ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </button>
        </form>
      </div>
    </div>
  );
}
