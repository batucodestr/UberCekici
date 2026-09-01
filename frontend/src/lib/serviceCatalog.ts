import { BatteryCharging, CircleGauge, LifeBuoy, Layers, Truck, Wrench } from "lucide-react";

export const SERVICE_CATALOG: Record<
  string,
  { icon: typeof Truck; description: string }
> = {
  towing: {
    icon: Truck,
    description: "Aracınızı bulunduğunuz noktadan istediğiniz servise veya adrese güvenle taşıyoruz.",
  },
  roadside: {
    icon: Wrench,
    description: "Yolda kaldığınızda size en yakın operatör dakikalar içinde yanınızda.",
  },
  battery: {
    icon: BatteryCharging,
    description: "Aküniz bittiğinde yerinizden kalkmadan takviye veya değişim hizmeti alın.",
  },
  tire: {
    icon: CircleGauge,
    description: "Patlak veya inik lastiğinizi yol kenarında hızlıca değiştiriyoruz.",
  },
  recovery: {
    icon: LifeBuoy,
    description: "Kaza veya arazi dışına çıkma gibi durumlarda profesyonel kurtarma ekipmanıyla müdahale.",
  },
  multi: {
    icon: Layers,
    description: "Birden fazla aracınızı aynı seferde, tek talep üzerinden güvenle çekiyoruz.",
  },
};
