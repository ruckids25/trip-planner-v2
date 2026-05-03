'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactElement, SVGProps } from 'react';
import { IconHome, IconGrid, IconMap, IconShare } from './Icons';

interface NavItemDef {
  key: string;
  href: string | null;
  label: string;
  Icon: (p: SVGProps<SVGSVGElement>) => ReactElement;
  active: boolean;
}

/**
 * Fixed bottom nav — 4 tabs.
 *
 * Routing rules:
 *   - ทริปของฉัน → /dashboard (always enabled)
 *   - ภาพรวม      → /trips/{tripId}/plan          (disabled if no trip context)
 *   - วันนี้      → /trips/{tripId}/plan?day=today (disabled if no trip context)
 *   - แชร์        → /shared/{tripId}              (disabled if no trip context)
 *
 * The trip context is detected from the URL — `/trips/[tripId]/...` and
 * `/shared/[tripId]` both yield the tripId. On `/dashboard` (no trip yet),
 * the trip-scoped tabs render disabled (greyed out, not clickable).
 */
export default function BottomNav() {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();

  // Extract tripId from either /trips/[id]/... or /shared/[id]
  const tripMatch = pathname.match(/^\/(?:trips|shared)\/([^/?#]+)/);
  const tripId = tripMatch?.[1] ?? null;

  const isPlanRoute = pathname.startsWith('/trips/') && pathname.includes('/plan');
  const isSharedRoute = pathname.startsWith('/shared/');
  const dayParam = searchParams?.get('day');
  const isDayView = isPlanRoute && dayParam !== null && dayParam !== '';

  const items: NavItemDef[] = [
    {
      key: 'home',
      href: '/dashboard',
      label: 'ทริปของฉัน',
      Icon: IconHome,
      active: pathname === '/' || pathname.startsWith('/dashboard'),
    },
    {
      key: 'overview',
      href: tripId ? `/trips/${tripId}/plan` : null,
      label: 'ภาพรวม',
      Icon: IconGrid,
      active: isPlanRoute && !isDayView,
    },
    {
      key: 'today',
      href: tripId ? `/trips/${tripId}/plan?day=today` : null,
      label: 'วันนี้',
      Icon: IconMap,
      active: isDayView,
    },
    {
      key: 'share',
      href: tripId ? `/shared/${tripId}` : null,
      label: 'แชร์',
      Icon: IconShare,
      active: isSharedRoute,
    },
  ];

  return (
    <nav className="bottom-nav">
      {items.map(({ key, href, label, Icon, active }) => {
        const disabled = href === null;
        const className = `nav-item ${active ? 'active' : ''}`;
        if (disabled) {
          return (
            <button
              key={key}
              className={className}
              disabled
              style={{ opacity: 0.35, cursor: 'not-allowed' }}
              aria-disabled="true"
            >
              <Icon />
              <span className="nav-label">{label}</span>
            </button>
          );
        }
        return (
          <Link key={key} href={href} className={className}>
            <Icon />
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
