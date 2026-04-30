'use client';

import { use, ReactNode } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import Header from '@/components/ui/Header';
import Stepper from '@/components/ui/Stepper';

interface TripLayoutProps {
  children: ReactNode;
  params: Promise<{ tripId: string }>;
}

export default function TripLayout({ children, params }: TripLayoutProps) {
  const { tripId } = use(params);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Stepper tripId={tripId} />
        <main>{children}</main>
      </div>
    </AuthGuard>
  );
}
