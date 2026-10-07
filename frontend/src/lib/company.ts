/**
 * iyzico üye işyeri başvurusunun istediği firma künyesi.
 *
 * iyzico, resmi belgelerdeki bilgilerin web sitesinde birebir aynı şekilde
 * yayınlanmasını şart koşar. Buradaki değerler footer, giriş ekranı, yönetici
 * paneli ve tüm yasal metinlerde otomatik olarak kullanılır.
 *
 * Kaynaklar:
 *  - GİB İşe Başlama Bildirimi, Kayıt No 1396723, 29.09.2026
 *    (vergi dairesi, faaliyet adresi, telefon, faaliyet kodları)
 *  - İzmir Oto Tamirciler Esnaf ve Sanatkarlar Odası Mesleki Faaliyet Belgesi,
 *    Belge No 34219016, 06.10.2026 (esnaf sicil no, oda kaydı)
 *
 * Not: T.C. kimlik numarası bilerek yayınlanmaz — iyzico bunu sitede aramaz
 * ve vergi kimlik numarası zaten ayrıca mevcuttur.
 *
 * Künye eksiksizdir. Bu bilgilerden biri değişirse (adres taşıma, vergi
 * dairesi değişikliği, yeni telefon) yalnızca burayı güncelleyin — sitedeki
 * tüm görünümler buradan beslenir. Sitedeki künye ile resmi kayıtların
 * ayrışması iyzico açısından ret sebebidir.
 */
export const COMPANY = {
  /** Resmi belgelerdeki ad soyad + işletme adı (şahıs/esnaf işletmesi). */
  legalName: "Gökhan Akça (Kurtarıcım)",
  /** İşletme sahibi. */
  ownerName: "Gökhan Akça",
  /** Müşteriye görünen marka / işletme adı. */
  brandName: "Kurtarıcım",
  /** İşe Başlama Bildirimi'ndeki faaliyet adresi. */
  address: "Cengizhan Mahallesi, 1620/25 Sokak No: 67/1 İç Kapı No: 3, Bayraklı / İzmir",
  /** Bağlı olunan vergi dairesi. */
  taxOffice: "Karşıyaka Vergi Dairesi Müdürlüğü",
  /** Vergi kimlik numarası. */
  taxNumber: "0180599298",
  /** Esnaf ve sanatkar sicil numarası. */
  craftRegistryNumber: "568895",
  /** Kayıtlı olunan meslek odası. */
  chamber: "İzmir Oto Tamirciler Esnaf ve Sanatkarlar Odası",
  /** Ana faaliyet kodu. */
  activityCode: "522104",
  /** Ana faaliyet konusu. */
  activity:
    "Kara yolu taşımacılığı ile ilgili özel ve ticari araçlar için çekme ve yol yardımı faaliyetleri",
  /** Bildirimde yer alan yan faaliyetler. */
  otherActivities: [
    "953103 — Motorlu kara taşıtlarının yağlama, yıkama, cilalama vb. faaliyetleri",
    "953102 — Motorlu kara taşıtlarının lastik onarımı faaliyetleri",
    "953101 — Motorlu kara taşıtlarının genel onarım ve bakımı faaliyetleri",
  ],
  /** İşe başlama tarihi. */
  startDate: "01.10.2026",
  /** Müşteri iletişim telefonu. */
  phone: "+90 538 779 02 35",
  /** Telefon bağlantıları için sade biçim. */
  phoneHref: "+905387790235",
  /** Müşteri iletişim e-postası. */
  email: "akcagokhan3525@gmail.com",
  /**
   * KEP (Kayıtlı Elektronik Posta) adresi. iyzico iletişim bölümünde KEP
   * adresini de arıyor; şahıs/esnaf işletmelerinde KEP zorunlu olmadığı için
   * yoksa boş bırakın — satır künyeden otomatik düşer.
   */
  kepAddress: "",
  /** Yayında olan alan adı. */
  website: "kurtarıcım.com.tr",
} as const;

/**
 * Künye satırları. Boş bırakılan opsiyonel alanlar (ör. KEP adresi) listeden
 * otomatik düşer, böylece sitede boş bir satır görünmez.
 */
export const COMPANY_FACTS: { label: string; value: string }[] = [
  { label: "Ticaret Unvanı", value: COMPANY.legalName },
  { label: "Adres", value: COMPANY.address },
  { label: "Vergi Dairesi", value: COMPANY.taxOffice },
  { label: "Vergi Kimlik No", value: COMPANY.taxNumber },
  { label: "Esnaf Sicil No", value: COMPANY.craftRegistryNumber },
  { label: "Meslek Odası", value: COMPANY.chamber },
  { label: "Faaliyet Konusu", value: `${COMPANY.activityCode} — ${COMPANY.activity}` },
  { label: "Telefon", value: COMPANY.phone },
  { label: "E-posta", value: COMPANY.email },
  { label: "KEP Adresi", value: COMPANY.kepAddress },
].filter((fact) => fact.value.trim() !== "");
