/**
 * Sitede yayınlanan tarife. iyzico, satılan hizmetin ve fiyatının web
 * sitesinde görünür olmasını şart koşar.
 *
 * Buradaki değerler, yönetici panelindeki "Fiyat Kuralları", "Araç Tipleri" ve
 * "Hizmet Tipleri" kayıtlarından alınmıştır (son eşitleme: 07.10.2026).
 *
 * TODO(iyzico): Panelde tarifeyi değiştirdiğinizde bu dosyayı da güncelleyin.
 * Sitede yazan fiyatla tahsil edilen fiyatın farklı olması hem iyzico hem
 * tüketici mevzuatı açısından sorun yaratır.
 */

/** Şehir bazlı fiyat kuralları (TL). */
export const CITY_TARIFFS: {
  city: string;
  baseFee: number;
  pricePerKm: number;
  nightSurcharge: number;
}[] = [
  { city: "İzmir", baseFee: 750, pricePerKm: 50, nightSurcharge: 60 },
  { city: "İstanbul", baseFee: 800, pricePerKm: 50, nightSurcharge: 60 },
  { city: "Ankara", baseFee: 750, pricePerKm: 50, nightSurcharge: 60 },
  { city: "Antalya", baseFee: 750, pricePerKm: 50, nightSurcharge: 60 },
  { city: "Bursa", baseFee: 750, pricePerKm: 50, nightSurcharge: 60 },
  { city: "Adana", baseFee: 750, pricePerKm: 50, nightSurcharge: 60 },
  { city: "Kocaeli", baseFee: 750, pricePerKm: 50, nightSurcharge: 60 },
  { city: "Manisa", baseFee: 750, pricePerKm: 50, nightSurcharge: 60 },
];

export const TARIFF = {
  /** Gece tarifesinin başladığı saat. */
  nightStartHour: 22,
  /** Gece tarifesinin bittiği saat. */
  nightEndHour: 6,
  /** Tarifenin son güncellendiği tarih — sitede yayınlanır. */
  updatedAt: "07.10.2026",
} as const;

/**
 * Araç tipi katsayıları. Katsayı yalnızca mesafe ücretine uygulanır,
 * açılış ücretine değil (bkz. backend `calculate_price`).
 */
export const VEHICLE_MULTIPLIERS: { name: string; multiplier: number }[] = [
  { name: "Motosiklet", multiplier: 0.7 },
  { name: "Otomobil", multiplier: 1.0 },
  { name: "SUV", multiplier: 1.2 },
  { name: "Kamyonet", multiplier: 1.4 },
  { name: "Kapalı Kasa", multiplier: 1.5 },
  { name: "Traktör", multiplier: 1.6 },
  { name: "Çoklu Araç Çekimi", multiplier: 1.8 },
  { name: "Kamyon", multiplier: 2.0 },
  { name: "Otobüs", multiplier: 2.2 },
];

/** Sunulan hizmetler ve mesafe ücretine uygulanan katsayıları. */
export const SERVICES: { name: string; multiplier: number; description: string }[] = [
  {
    name: "Çekici",
    multiplier: 1.0,
    description:
      "Arızalı, kazalı veya çalışmayan aracın çekici ile belirttiğiniz varış noktasına taşınması.",
  },
  {
    name: "Yol Yardım",
    multiplier: 0.8,
    description:
      "Yolda kalan araca yerinde müdahale: yakıt ikmali, kapı açma ve benzeri acil yol desteği.",
  },
  {
    name: "Akü",
    multiplier: 0.6,
    description: "Akü takviyesi ve gerektiğinde yerinde akü değişimi.",
  },
  {
    name: "Lastik",
    multiplier: 0.6,
    description: "Patlak lastiğin yerinde değişimi veya stepne takılması.",
  },
  {
    name: "Çoklu Araç Çekimi",
    multiplier: 1.6,
    description: "Birden fazla aracın tek seferde taşınması.",
  },
  {
    name: "Kurtarma",
    multiplier: 1.8,
    description:
      "Şarampole, çamura veya kara saplanmış aracın özel ekipmanla kurtarılması.",
  },
];
