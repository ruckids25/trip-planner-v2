import type { Metadata } from 'next';
import './globals.css';
import ClientProviders from './providers';

export const metadata: Metadata = {
  title: 'TripPlanner — Plan Your Perfect Trip',
  description: 'Upload screenshots, auto-group spots, and create beautiful trip plans with real-time collaboration.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full font-sans">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
