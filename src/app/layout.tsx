import type { Metadata } from 'next';
import './globals.css';
import ClientProviders from './providers';

export const metadata: Metadata = {
  title: 'TripPlanner — Plan Your Perfect Trip',
  description: 'Upload screenshots, auto-group spots, and create beautiful trip plans with real-time collaboration.',
};

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
      </body>
    </html>
  );
}
