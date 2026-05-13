/**
 * Thin wrapper around Google Analytics events.
 *
 * - Lazy-imports `@next/third-parties/google` so it's not loaded server-side
 * - No-ops if NEXT_PUBLIC_GA_ID isn't set (dev environments without GA)
 * - All events are typed via the `EventName` union — keeps GA reports tidy
 *
 * Usage:
 *   import { track } from '@/lib/analytics';
 *   track('create_trip', { country: 'Japan', days: 6 });
 */

export type EventName =
  | 'sign_in'              // user successfully logged in via Google
  | 'sign_out'             // user logged out
  | 'create_trip'          // new trip created from dashboard
  | 'delete_trip'          // trip deleted from dashboard
  | 'open_trip'            // user opens an existing trip
  | 'upload_image'         // user uploads images on /upload page
  | 'ai_extract_done'      // OCR + Places enrichment finished
  | 'add_spot'             // user added a spot via search/url paste
  | 'delete_spot'          // user removed a spot
  | 'optimize_route'       // user clicked "เรียงเส้นทาง"
  | 'set_hotel'            // user picked a hotel for a day
  | 'share_open'           // ShareModal opened
  | 'share_copy'           // user copied the share link
  | 'share_external';      // user clicked LINE / Email / IG share

type EventParams = Record<string, string | number | boolean | undefined>;

export function track(event: EventName, params?: EventParams): void {
  // SSR-safe — Google Analytics is browser only
  if (typeof window === 'undefined') return;

  // Skip when GA isn't configured (no env var → no script loaded)
  if (!process.env.NEXT_PUBLIC_GA_ID) return;

  // Use the global gtag function injected by @next/third-parties.
  // We don't statically import it because the package's helper isn't
  // tree-shake-friendly for client components.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtag = (window as any).gtag;
  if (typeof gtag !== 'function') return;

  try {
    gtag('event', event, params || {});
  } catch (err) {
    // Never let analytics break the app
    console.warn('[analytics] track failed:', err);
  }
}
