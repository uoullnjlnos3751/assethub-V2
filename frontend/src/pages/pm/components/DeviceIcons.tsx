import React from 'react';

/**
 * ไอคอนแยกตามชนิดอุปกรณ์สำหรับแผนผังชั้น
 *
 * แผนผังเดิมใช้หมุดหยดน้ำหน้าตาเดียวกันหมด ต่างกันแค่สีตามสถานะ PM ทำให้มอง
 * ไม่ออกว่าจุดไหนเป็นโน้ตบุ๊ก จุดไหนเป็นเครื่องพิมพ์ ทั้งที่เป็นสิ่งแรกที่ต้องรู้
 * ตอนเดินหน้างาน
 *
 * วาดเป็น SVG เส้นแทนการใช้ไอคอนสำเร็จรูป เพราะต้องย่อลงเหลือ 12px บนป้ายที่นั่ง
 * แล้วยังต้องอ่านออก — ไอคอนที่มีรายละเอียดเยอะจะเละที่ขนาดนั้น
 */

export type DeviceKind = 'notebook' | 'desktop' | 'monitor' | 'printer' | 'network' | 'other';

export const KIND_LABEL: Record<DeviceKind, string> = {
  notebook: 'โน้ตบุ๊ก',
  desktop: 'พีซี',
  monitor: 'จอภาพ',
  printer: 'เครื่องพิมพ์',
  network: 'อุปกรณ์เครือข่าย',
  other: 'อื่น ๆ',
};

interface IconProps {
  size?: number;
  color?: string;
  /** ความหนาเส้น ปรับตามขนาดเพื่อให้เส้นไม่หายตอนย่อ */
  strokeWidth?: number;
}

function Svg({ size = 16, color = 'currentColor', strokeWidth, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth ?? (size <= 14 ? 2.4 : 1.9)}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** โน้ตบุ๊ก — จอเอียงบนฐานแบน */
export const NotebookIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="10" rx="1.5" />
    <path d="M2 18h20l-1.5-3H3.5z" />
  </Svg>
);

/** พีซีตั้งโต๊ะ — เคสตั้งข้างจอ ต่างจากโน้ตบุ๊กชัดเจนแม้ย่อเล็ก */
export const DesktopIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="12" height="9" rx="1.5" />
    <path d="M9 13v4M6 17h6" />
    <rect x="17.5" y="4" width="4" height="13" rx="1" />
  </Svg>
);

/** จอภาพ — จอพร้อมขาตั้ง ไม่มีเคส */
export const MonitorIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="4" width="19" height="12" rx="1.5" />
    <path d="M12 16v3M8 19h8" />
  </Svg>
);

/** เครื่องพิมพ์ — ตัวเครื่องกับกระดาษที่พ่นออกมา */
export const PrinterIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 9V3h10v6" />
    <rect x="3" y="9" width="18" height="7" rx="1.5" />
    <rect x="7" y="14" width="10" height="7" rx="1" />
  </Svg>
);

/** อุปกรณ์เครือข่าย — กล่องแบนกับเสาสัญญาณ */
export const NetworkIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="13" width="18" height="7" rx="1.5" />
    <path d="M7 16.5h.01M11 16.5h.01" />
    <path d="M12 13V8M9 6a4.2 4.2 0 0 1 6 0" />
  </Svg>
);

export const OtherIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8 12h8" />
  </Svg>
);

const BY_KIND: Record<DeviceKind, React.FC<IconProps>> = {
  notebook: NotebookIcon,
  desktop: DesktopIcon,
  monitor: MonitorIcon,
  printer: PrinterIcon,
  network: NetworkIcon,
  other: OtherIcon,
};

export function DeviceIcon({ kind, ...rest }: IconProps & { kind: DeviceKind }) {
  const C = BY_KIND[kind] ?? OtherIcon;
  return <C {...rest} />;
}

/** คนนั่งโต๊ะ — ใช้เป็นหมุดที่นั่งเวลายังไม่รู้ว่ามีอุปกรณ์อะไร */
export const SeatIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="7" r="3.2" />
    <path d="M5.5 20v-1.5A5.5 5.5 0 0 1 11 13h2a5.5 5.5 0 0 1 5.5 5.5V20" />
  </Svg>
);
