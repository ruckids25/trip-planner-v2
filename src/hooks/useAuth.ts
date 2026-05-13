'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { saveUser } from '@/lib/firestore';
import { track } from '@/lib/analytics';

/**
 * Detect in-app webviews where Google sign-in cannot work because
 * sessionStorage is partitioned/blocked. Examples: Facebook, Instagram,
 * Line, WhatsApp, Twitter, TikTok, KakaoTalk, WeChat.
 *
 * When detected, login() throws InAppBrowserError so the UI can prompt
 * "open in Safari/Chrome".
 */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|WhatsApp|TwitterAndroid|Twitter for|TikTok|KAKAOTALK/i.test(ua);
}

export class InAppBrowserError extends Error {
  code = 'IN_APP_BROWSER_BLOCKED' as const;
  constructor() { super('In-app browser does not support Google sign-in'); }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to auth state changes + handle redirect-return
  useEffect(() => {
    let cancelled = false;

    // If we got here from a signInWithRedirect round-trip, finalise the result.
    // No-op if there's no pending redirect; we swallow the storage-partitioned
    // error so onAuthStateChanged still fires for valid sessions.
    getRedirectResult(auth).catch((err) => {
      console.warn('[auth] getRedirectResult skipped:', err?.code || err?.message);
    });

    // Track only the FIRST time a user becomes authenticated in this tab,
    // so onAuthStateChanged firing multiple times doesn't inflate sign_in counts.
    let signInTracked = false;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (cancelled) return;
      setUser(u);
      if (u) {
        if (!signInTracked) {
          signInTracked = true;
          track('sign_in', { method: 'google' });
        }
        try {
          await saveUser(u.uid, {
            displayName: u.displayName || '',
            email: u.email || '',
            photoURL: u.photoURL || '',
          });
        } catch (err) {
          console.error('[auth] saveUser failed:', err);
        }
      }
      setLoading(false);
    });

    return () => { cancelled = true; unsub(); };
  }, []);

  const login = useCallback(async () => {
    // Block in-app webviews explicitly — popup AND redirect both fail there.
    if (isInAppBrowser()) {
      throw new InAppBrowserError();
    }

    try {
      // Popup is the fastest UX on mobile Safari + desktop.
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // If popup was blocked OR closed without selecting an account, fall back
      // to redirect — standard recovery path.
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      console.error('[auth] login failed:', err);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    track('sign_out');
    await signOut(auth);
  }, []);

  return { user, loading, login, logout };
}
