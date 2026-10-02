import { Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ADMIN_HOME, AdminRoute } from "@/components/ProtectedRoute";
import AdminAuditLogPage from "@/pages/admin/AdminAuditLogPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminDriversPage from "@/pages/admin/AdminDriversPage";
import AdminPriceRulesPage from "@/pages/admin/AdminPriceRulesPage";
import AdminProfilePage from "@/pages/admin/AdminProfilePage";
import AdminRequestsPage from "@/pages/admin/AdminRequestsPage";
import AdminTicketsPage from "@/pages/admin/AdminTicketsPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import LoginPage from "@/pages/auth/LoginPage";
import KvkkPage from "@/pages/legal/KvkkPage";
import PrivacyPage from "@/pages/legal/PrivacyPage";
import TermsPage from "@/pages/legal/TermsPage";

/**
 * Site tamamen yönetici kontrol panelidir: ilk ekran giriş, sonrası panel.
 * Müşteri çağırma ve sürücü işlemleri mobil uygulamada yürütülür; burada
 * yalnızca mobil uygulamayı yöneten ekranlar ve müşteri şikayet/istekleri yer alır.
 * Yasal metinler (mobil uygulama ve mağaza bağlantıları için) herkese açıktır.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/giris" element={<LoginPage />} />

      <Route path="/kvkk" element={<KvkkPage />} />
      <Route path="/gizlilik-sozlesmesi" element={<PrivacyPage />} />
      <Route path="/kullanim-sartlari" element={<TermsPage />} />

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="tickets" element={<AdminTicketsPage />} />
          <Route path="requests" element={<AdminRequestsPage />} />
          <Route path="drivers" element={<AdminDriversPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="pricing" element={<AdminPriceRulesPage />} />
          <Route path="audit-logs" element={<AdminAuditLogPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
        </Route>
      </Route>

      {/* Eski /admin/dashboard/* bağlantıları panelin yeni köküne taşındı. */}
      <Route path="/admin/dashboard/*" element={<Navigate to={ADMIN_HOME} replace />} />

      <Route path="*" element={<Navigate to={ADMIN_HOME} replace />} />
    </Routes>
  );
}
