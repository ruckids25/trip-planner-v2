'use client';

/**
 * Trip layout — kept thin so each trip page can render its own
 * mobile-frame header/nav. The redesigned /plan and /upload pages
 * include their own BottomNav, so we no longer wrap with the global
 * Header / Stepper here.
 *
 * /manage and /calendar (legacy onboarding flow) still use this
 * layout but render full-screen without the previous chrome.
 */
import { ReactNode } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';

interface TripLayoutProps {
  children: ReactNode;
}

export default function TripLayout({ children }: TripLayoutProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        {children}
      </div>
    </AuthGuard>
  );
}
