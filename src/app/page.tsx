'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthProvider';
import {
  IconMapPin, IconChevRight, IconWand, IconHotel, IconSearch,
} from '@/components/ui/Icons';

/**
 * Landing page — clean Thai-first introduction to the app.
 * Uses the same design tokens as the rest of the app (indigo accent,
 * Sarabun + DM Sans, --bg / --surface / --border).
 */
export default function LandingPage() {
  const { user, loading, login } = useAuthContext();
  const router = useRouter();

  // Already signed in → straight to dashboard
  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)', color: 'var(--text-primary)' }}>
      {/* ── Top nav ─────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 17, fontFamily: 'var(--font-head)' }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8, background: 'var(--accent)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconMapPin width={16} height={16} />
            </span>
            Trip Planner
          </div>
          <button onClick={login} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, borderRadius: 99 }}>
            เข้าใช้งาน
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────── */}
      <section style={{ padding: '64px 20px 48px' }}>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gap: 48,
            gridTemplateColumns: '1fr',
            alignItems: 'center',
          }}
          className="landing-hero-grid"
        >
          {/* Copy */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                background: 'var(--accent-light)',
                color: 'var(--accent)',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 18,
              }}
            >
              <IconWand width={13} height={13} />
              วางแผนทริปด้วย AI
            </div>
            <h1
              style={{
                fontSize: 'clamp(32px, 5vw, 46px)',
                fontWeight: 700,
                fontFamily: 'var(--font-head)',
                lineHeight: 1.15,
                marginBottom: 16,
              }}
            >
              จากภาพหน้าจอ
              <br />
              สู่ <span style={{ color: 'var(--accent)' }}>แผนเที่ยวสมบูรณ์</span>
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28, maxWidth: 480 }}>
              อัปโหลดภาพสถานที่จาก Google Maps แล้วให้ AI ดึงข้อมูล จัดกลุ่มตามย่าน
              และสร้างกำหนดการรายวันที่เดินทางไม่อ้อม — ทำเสร็จในไม่กี่วินาที
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={login} className="btn-primary" style={{ padding: '14px 24px', fontSize: 15 }}>
                เริ่มสร้างทริป
                <IconChevRight width={16} height={16} />
              </button>
              <a
                href="#how-it-works"
                style={{
                  padding: '14px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                ดูวิธีใช้งาน →
              </a>
            </div>
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              ✓ ใช้งานฟรี · ✓ ทำงานได้ทุกประเทศ · ✓ แชร์ให้เพื่อนแก้ไขร่วมได้
            </p>
          </div>

          {/* Phone mockup */}
          <PhoneMockup />
        </div>
      </section>

      {/* ── How it works (3 steps) ─────────────────── */}
      <section id="how-it-works" style={{ padding: '56px 20px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p className="section-label" style={{ textAlign: 'center', marginBottom: 8 }}>วิธีใช้งาน</p>
          <h2
            style={{
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: 40,
              fontFamily: 'var(--font-head)',
            }}
          >
            3 ขั้นง่ายๆ จากศูนย์ถึงพร้อมเดินทาง
          </h2>
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            <FeatureCard
              step={1}
              accent="#4F46E5"
              icon={<IconSearch width={22} height={22} />}
              title="อัปโหลดภาพสถานที่"
              desc="แคปจาก Google Maps, IG หรือบล็อกท่องเที่ยว — AI อ่านชื่อสถานที่และระบุพิกัดให้อัตโนมัติ"
            />
            <FeatureCard
              step={2}
              accent="#0891B2"
              icon={<IconWand width={22} height={22} />}
              title="จัดกลุ่ม + เรียงเส้นทาง"
              desc="AI clustering รวมที่ใกล้กันเป็นกลุ่ม แล้วเรียงเส้นทางให้เดินทางสั้นที่สุด"
            />
            <FeatureCard
              step={3}
              accent="#059669"
              icon={<IconHotel width={22} height={22} />}
              title="กำหนดการรายวัน"
              desc="กำหนดวันเริ่ม-จบ + โรงแรมที่พัก แล้วแชร์ลิงก์ให้เพื่อนแก้ไขร่วมแบบ real-time"
            />
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section style={{ padding: '72px 20px' }}>
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            textAlign: 'center',
            padding: '48px 24px',
            background: `linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)`,
            color: 'white',
            borderRadius: 'var(--radius)',
          }}
        >
          <h2 style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-head)', marginBottom: 10 }}>
            พร้อมแล้ว ลองเลย
          </h2>
          <p style={{ fontSize: 15, opacity: 0.9, marginBottom: 24 }}>
            เข้าใช้งานด้วย Google ใน 30 วินาที — ไม่มีค่าใช้จ่าย
          </p>
          <button
            onClick={login}
            style={{
              background: 'white',
              color: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }}
          >
            เริ่มสร้างทริปฟรี →
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 20px' }}>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconMapPin width={14} height={14} /> Trip Planner
          </div>
          <p>Built with Next.js + Firebase</p>
        </div>
      </footer>

      {/* Hero grid breakpoint — desktop layout side-by-side */}
      <style>{`
        @media (min-width: 768px) {
          .landing-hero-grid {
            grid-template-columns: 1.1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FeatureCard — one of three steps
   ───────────────────────────────────────────────────────────── */
function FeatureCard({
  step, accent, icon, title, desc,
}: {
  step: number;
  accent: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          fontSize: 80,
          fontWeight: 700,
          color: accent,
          opacity: 0.06,
          fontFamily: 'var(--font-head)',
          lineHeight: 1,
        }}
      >
        {step}
      </div>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${accent}18`,
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: 1, marginBottom: 4 }}>
        STEP {step}
      </p>
      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, fontFamily: 'var(--font-head)' }}>
        {title}
      </h3>
      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PhoneMockup — pure-CSS phone frame previewing the app
   ───────────────────────────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: 280,
          aspectRatio: '9 / 19',
          background: '#111827',
          borderRadius: 36,
          padding: 10,
          boxShadow: '0 30px 60px rgba(15, 23, 42, 0.18)',
          position: 'relative',
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 100,
            height: 20,
            background: '#111827',
            borderRadius: 99,
            zIndex: 2,
          }}
        />
        {/* Screen */}
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'var(--bg)',
            borderRadius: 28,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Mock header */}
          <div style={{ padding: '38px 16px 12px', background: 'white', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>สวัสดีตอนเช้า ☀️</p>
            <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-head)' }}>ทริปของฉัน</h3>
          </div>
          {/* Mock featured card */}
          <div style={{ padding: 12 }}>
            <div
              style={{
                background: 'linear-gradient(135deg, var(--accent-light), white)',
                border: '1.5px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <span style={{ background: 'var(--accent)', color: 'white', fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>
                  กำลังมา
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>23 วัน</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-head)' }}>โตเกียว ซากุระ 2026</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>🗾 Japan · 6 วัน</p>
                </div>
                <span style={{ fontSize: 24 }}>🗾</span>
              </div>
            </div>
            {/* Day rows */}
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { color: '#4F46E5', emoji: '⛩️', area: 'อาซากุสะ' },
                { color: '#0891B2', emoji: '🛍️', area: 'ชินจุกุ' },
                { color: '#059669', emoji: '🏙️', area: 'ชิบูย่า' },
              ].map((d, i) => (
                <div
                  key={i}
                  style={{
                    background: 'white',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: `${d.color}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {d.emoji}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      วันที่ {i + 1} · {d.area}
                    </p>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>5 จุด</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
