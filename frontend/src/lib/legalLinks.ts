/**
 * iyzico üye işyeri başvurusunun web sitesinde aradığı zorunlu sayfalar.
 * Tek kaynak: footer, giriş ekranı ve yönetici paneli aynı listeyi kullanır,
 * böylece bir sayfa eklenince üç yerde birden görünür.
 */
export const LEGAL_LINKS = [
  { to: "/hakkimizda", label: "Hakkımızda", short: "Hakkımızda" },
  { to: "/hizmetlerimiz", label: "Hizmetler ve Fiyatlandırma", short: "Hizmetler" },
  { to: "/kurumsal-cozumler", label: "Kurumsal Çözümler", short: "Kurumsal" },
  { to: "/sss", label: "Sıkça Sorulan Sorular", short: "S.S.S." },
  { to: "/iletisim", label: "İletişim", short: "İletişim" },
  { to: "/on-bilgilendirme-formu", label: "Ön Bilgilendirme Formu", short: "Ön Bilgilendirme" },
  { to: "/mesafeli-satis-sozlesmesi", label: "Mesafeli Satış Sözleşmesi", short: "Mesafeli Satış" },
  { to: "/teslimat-ve-iade", label: "Teslimat ve İade Koşulları", short: "Teslimat ve İade" },
  { to: "/kullanim-sartlari", label: "Kullanım Şartları", short: "Kullanım Şartları" },
  { to: "/gizlilik-sozlesmesi", label: "Gizlilik Sözleşmesi", short: "Gizlilik" },
  { to: "/kvkk", label: "KVKK Aydınlatma Metni", short: "KVKK" },
] as const;
