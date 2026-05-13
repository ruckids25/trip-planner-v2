import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import ClientProviders from './providers';

export const metadata: Metadata = {
  title: 'Trip Planner — วางแผนทริปด้วย AI',
  description: 'อัปโหลดภาพสถานที่จาก Google Maps แล้วให้ AI ดึงข้อมูล จัดกลุ่ม และสร้างกำหนดการรายวันให้อัตโนมัติ',
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full" style={{ fontFamily: 'var(--font-body)' }}>
        <ClientProviders>
          {children}
        </ClientProviders>
        {/* Google Analytics 4 — only loads in production with NEXT_PUBLIC_GA_ID set */}
        {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      </body>
    </html>
  );
}
