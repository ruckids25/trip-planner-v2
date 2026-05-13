'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from './AuthProvider';
import { isInAppBrowser, InAppBrowserError } from '@/hooks/useAuth';

export default function LoginButton() {
  const { login } = useAuthContext();
  const [error, setError] = useState<'in_app' | 'unknown' | null>(null);
  const [busy, setBusy] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Detect in-app browser on mount so we can warn before the user clicks
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only init from window
    setCurrentUrl(window.location.href);
    if (isInAppBrowser()) setError('in_app');
  }, []);

  const handleLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      await login();
      // Success — onAuthStateChanged will redirect via the page guard.
    } catch (err) {
      if (err instanceof InAppBrowserError) {
        setError('in_app');
      } else {
        const code = (err as { code?: string })?.code;
        // Don't surface the user closing the popup as a hard error.
        if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
          setError('unknown');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can long-press URL bar instead */
    }
  };

  // ── In-app browser warning ──
  if (error === 'in_app') {
    return (
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div
          style={{
            background: 'var(--amber-light)',
            border: '1px solid #FDE68A',
            borderRadius: 12,
            padding: 16,
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>
              เปิดในเบราว์เซอร์หลักก่อนนะ
            </p>
          </div>
          <p style={{ fontSize: 13, color: '#78350F', lineHeight: 1.6 }}>
            ตอนนี้คุณกำลังเปิดผ่าน in-app browser (Facebook / IG / Line ฯลฯ) ซึ่ง Google ไม่อนุญาตให้ login จากตรงนี้
            <br />
            <br />
            <strong>วิธีแก้:</strong>
            <br />
            • iOS — กดปุ่ม <strong>•••</strong> มุมขวาล่าง แล้วเลือก <em>&ldquo;เปิดใน Safari&rdquo;</em>
            <br />
            • Android — กดปุ่ม <strong>⋮</strong> มุมขวาบน แล้วเลือก <em>&ldquo;เปิดในเบราว์เซอร์&rdquo;</em>
          </p>
        </div>

        <button
          onClick={copyUrl}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: copied ? 'var(--green)' : 'white',
            color: copied ? 'white' : 'var(--text-secondary)',
            border: copied ? '1.5px solid var(--green)' : '1.5px solid var(--border)',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginBottom: 8,
            transition: 'background .15s, color .15s, border-color .15s',
          }}
        >
          {copied ? '✅ คัดลอกแล้ว' : '📋 คัดลอกลิงก์เว็บ'}
        </button>
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            textAlign: 'center',
            wordBreak: 'break-all',
          }}
        >
          {currentUrl}
        </p>
      </div>
    );
  }

  // ── Default Google sign-in button ──
  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
      {error === 'unknown' && (
        <div
          style={{
            background: 'var(--red-light)',
            border: '1px solid #FECACA',
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            fontSize: 13,
            color: '#991B1B',
            textAlign: 'center',
          }}
        >
          เข้าสู่ระบบไม่สำเร็จ — ลองอีกครั้งหรือเปิดในเบราว์เซอร์อื่น
        </div>
      )}
      <button
        onClick={handleLogin}
        disabled={busy}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          width: '100%',
          padding: '14px 24px',
          background: 'white',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          fontWeight: 600,
          fontSize: 15,
          fontFamily: 'var(--font-body)',
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.7 : 1,
          transition: 'box-shadow .15s, opacity .15s',
        }}
      >
        {busy ? (
          <span
            style={{
              width: 16,
              height: 16,
              border: '2px solid var(--text-muted)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin .7s linear infinite',
            }}
          />
        ) : (
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
        )}
        {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
      </button>
    </div>
  );
}
