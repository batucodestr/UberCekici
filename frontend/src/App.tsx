import { Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AdminAuditLogPage from "@/pages/admin/AdminAuditLogPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminDriversPage from "@/pages/admin/AdminDriversPage";
import AdminPriceRulesPage from "@/pages/admin/AdminPriceRulesPage";
import AdminRequestsPage from "@/pages/admin/AdminRequestsPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import LoginPage from "@/pages/auth/LoginPage";
import CustomerDashboard from "@/pages/customer/CustomerDashboard";
import CustomerEntryPage from "@/pages/customer/CustomerEntryPage";
import NewRequestPage from "@/pages/customer/NewRequestPage";
import TrackingPage from "@/pages/customer/TrackingPage";
import DriverDashboard from "@/pages/driver/DriverDashboard";
import HizmetlerimizPage from "@/pages/HizmetlerimizPage";
import HomePage from "@/pages/HomePage";
import KurumsalPage from "@/pages/KurumsalPage";
import FaqPage from "@/pages/legal/FaqPage";
import KvkkPage from "@/pages/legal/KvkkPage";
import PrivacyPage from "@/pages/legal/PrivacyPage";
import SupportPage from "@/pages/legal/SupportPage";
import TermsPage from "@/pages/legal/TermsPage";
import SettingsPage from "@/pages/settings/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/giris" element={<LoginPage />} />
      <Route path="/hizmetlerimiz" element={<HizmetlerimizPage />} />
      <Route path="/kurumsal-cozumler" element={<KurumsalPage />} />
      <Route path="/kvkk" element={<KvkkPage />} />
      <Route path="/gizlilik-sozlesmesi" element={<PrivacyPage />} />
      <Route path="/kullanim-sartlari" element={<TermsPage />} />
      <Route path="/sss" element={<FaqPage />} />
      <Route path="/destek" element={<SupportPage />} />

      <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
        <Route path="/musteri" element={<CustomerEntryPage />} />
        <Route path="/musteri/yeni-talep" element={<NewRequestPage />} />
        <Route path="/musteri/takip/:id" element={<TrackingPage />} />
        <Route path="/musteri/gecmisim" element={<CustomerDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["driver"]} />}>
        <Route path="/surucu" element={<DriverDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["customer", "driver"]} />}>
        <Route path="/ayarlar" element={<SettingsPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="requests" element={<AdminRequestsPage />} />
          <Route path="drivers" element={<AdminDriversPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="pricing" element={<AdminPriceRulesPage />} />
          <Route path="audit-logs" element={<AdminAuditLogPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
