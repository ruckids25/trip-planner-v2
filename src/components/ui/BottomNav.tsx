'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement, SVGProps } from 'react';
import { IconHome, IconGrid, IconMap, IconShare } from './Icons';

interface NavItemDef {
  href: string;
  label: string;
  Icon: (p: SVGProps<SVGSVGElement>) => ReactElement;
  match: (pathname: string) => boolean;
}

/**
 * Fixed bottom nav — only ever shows 4 tabs on mobile-frame routes.
 * The "active" highlight comes from `nav-item.active` in globals.css.
 */
export default function BottomNav() {
  const pathname = usePathname() ?? '/';

  const items: NavItemDef[] = [
    {
      href: '/dashboard',
      label: 'ทริปของฉัน',
      Icon: IconHome,
      match: (p) => p === '/' || p.startsWith('/dashboard'),
    },
    {
      href: '/dashboard?view=overview',
      label: 'ภาพรวม',
      Icon: IconGrid,
      match: (p) => p.includes('/plan') && !p.includes('day='),
    },
    {
      href: '/dashboard?view=day',
      label: 'วันนี้',
      Icon: IconMap,
      match: (p) => p.includes('day='),
    },
    {
      href: '/share',
      label: 'แชร์',
      Icon: IconShare,
      match: (p) => p.startsWith('/share') || p.startsWith('/shared'),
    },
  ];

  return (
    <nav className="bottom-nav">
      {items.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`nav-item ${active ? 'active' : ''}`}
          >
            <Icon />
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
