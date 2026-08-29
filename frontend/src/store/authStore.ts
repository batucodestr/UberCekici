import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthResponse, User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (auth: AuthResponse) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (auth) =>
        set({
          user: auth.user,
          accessToken: auth.access,
        }),
      updateUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null }),
    }),
    { name: "cekicim-auth" }
  )
);
