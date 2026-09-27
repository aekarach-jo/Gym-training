import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORM. | พื้นที่ฝึกของฉัน",
  description: "เว็บฝึกออกกำลังกายส่วนตัว พร้อมภาพสาธิตท่า โค้ชกล้อง และบันทึกความก้าวหน้า",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
