'use client';

import { useEffect, useState } from 'react';
import { Trip } from '@/types';
import { setTripShared } from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';
import { IconCheck, IconCopy, IconX } from '@/components/ui/Icons';

interface Props {
  trip: Trip;
  open: boolean;
  onClose: () => void;
}

/**
 * In-app share modal — bottom sheet with permission toggle, copy link,
 * and LINE / Email / IG share buttons.
 *
 * Flips `trip.isShared` in Firestore when the user opens this modal so the
 * `/shared/[tripId]` route allows access.
 */
export default function ShareModal({ trip, open, onClose }: Props) {
  const { toast } = useToast();
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [copied, setCopied] = useState(false);

  // Flip isShared on open the first time
  useEffect(() => {
    if (open && !trip.isShared) {
      setTripShared(trip.id, true).catch(() => {
        toast('เปิดการแชร์ไม่สำเร็จ', 'error');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/shared/${trip.id}${permission === 'edit' ? '?mode=edit' : ''}`
      : '';

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast('คัดลอกลิงก์แล้ว!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('คัดลอกไม่สำเร็จ', 'error');
    }
  };

  return (
    <>
      <div className={`sheet-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`bottom-sheet ${open ? 'open' : ''}`}>
        <div className="sheet-handle" />

        <div style={{ padding: '20px 20px 40px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 4,
                }}
              >
                แชร์ทริป
              </p>
              <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)' }}>{trip.title}</h2>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
              aria-label="ปิด"
            >
              <IconX />
            </button>
          </div>

          {/* Permission toggle */}
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: 12,
              padding: 4,
              display: 'flex',
              gap: 4,
              marginBottom: 16,
              border: '1px solid var(--border)',
            }}
          >
            {[
              { id: 'view' as const, label: '👁 ดูอย่างเดียว' },
              { id: 'edit' as const, label: '✏️ แก้ไขได้' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPermission(p.id)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  background: permission === p.id ? 'white' : 'transparent',
                  color: permission === p.id ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: permission === p.id ? 700 : 500,
                  fontSize: 14,
                  fontFamily: 'var(--font-body)',
                  boxShadow: permission === p.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Link copy */}
          <div className="card" style={{ padding: 14, marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              ลิงก์แชร์ ({permission === 'view' ? 'ดูอย่างเดียว' : 'แก้ไขได้'})
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  background: 'var(--bg)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  border: '1px solid var(--border)',
                }}
              >
                {shareUrl}
              </div>
              <button
                onClick={handleCopy}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: copied ? 'var(--green)' : 'var(--accent)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background .2s',
                  fontFamily: 'var(--font-body)',
                  flexShrink: 0,
                }}
              >
                {copied ? (
                  <>
                    <IconCheck width={14} height={14} />
                    คัดลอกแล้ว!
                  </>
                ) : (
                  <>
                    <IconCopy width={14} height={14} />
                    คัดลอก
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Share via */}
          <p className="section-label" style={{ marginBottom: 10 }}>แชร์ผ่าน</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              {
                label: 'LINE',
                bg: '#06C755',
                icon: '💬',
                href: `https://line.me/R/msg/text/?${encodeURIComponent(shareUrl)}`,
              },
              {
                label: 'อีเมล',
                bg: '#EA4335',
                icon: '📧',
                href: `mailto:?subject=${encodeURIComponent(trip.title)}&body=${encodeURIComponent(shareUrl)}`,
              },
              {
                label: 'IG',
                bg: '#E1306C',
                icon: '📸',
                href: shareUrl,
              },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 10,
                  border: 'none',
                  background: `${s.bg}18`,
                  color: s.bg,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
