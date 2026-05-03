'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTrip } from '@/hooks/useTrip';
import { useAuthContext } from '@/components/auth/AuthProvider';
import AuthGuard from '@/components/auth/AuthGuard';
import { addSpot } from '@/lib/firestore';
import { uploadImage, resizeImage } from '@/lib/storage';
import { ocrImage, lookupPlace } from '@/lib/vision';
import { useToast } from '@/components/ui/Toast';
import { IconChevLeft, IconCheck, IconX } from '@/components/ui/Icons';
import { SpotType } from '@/types';

const STEPS = ['สร้างทริป', 'อัปโหลดภาพ', 'จัดกลุ่ม', 'แผนทริป'];

interface UploadFile {
  id: string;
  file: File;
  url: string;
  size: string;
  status: 'ready' | 'processing' | 'done' | 'error';
  spots: string[];
  error?: string;
}

export default function UploadPage({ params }: { params: Promise<{ tripId: string }> }) {
  return (
    <AuthGuard>
      <UploadInner params={params} />
    </AuthGuard>
  );
}

function UploadInner({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { user } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drop zone handlers ───────────────────────────
  const handleFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter((f) => f.type.startsWith('image/'));
    if (!arr.length) return;
    const items: UploadFile[] = arr.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      url: URL.createObjectURL(f),
      size: (f.size / 1024).toFixed(0) + ' KB',
      status: 'ready',
      spots: [],
    }));
    setFiles((prev) => [...prev, ...items]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heuristic: map a Google place type to our SpotType
  const placeTypeToSpotType = (types: string[]): SpotType => {
    const t = types.join(' ').toLowerCase();
    if (t.includes('temple') || t.includes('shrine') || t.includes('place_of_worship')) return 'temple';
    if (t.includes('restaurant') || t.includes('food') || t.includes('meal')) return 'food';
    if (t.includes('cafe')) return 'cafe';
    if (t.includes('store') || t.includes('shopping')) return 'shopping';
    if (t.includes('park')) return 'park';
    if (t.includes('museum')) return 'museum';
    if (t.includes('lodging') || t.includes('hotel')) return 'hotel';
    if (t.includes('transit') || t.includes('train') || t.includes('bus_station')) return 'transport';
    if (t.includes('tourist_attraction') || t.includes('landmark')) return 'attraction';
    return 'other';
  };

  // ── AI processing pipeline ──────────────────────
  const handleProcess = async () => {
    if (!files.length || !user || !trip) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setFiles((prev) => prev.map((x, idx) => (idx === i ? { ...x, status: 'processing' } : x)));
      try {
        // 1. Upload + resize
        const base64 = await resizeImage(f.file);
        const storagePath = `trips/${tripId}/uploads/${Date.now()}-${f.file.name}`;
        await uploadImage(f.file, storagePath);
        // 2. OCR
        const { placeNames } = await ocrImage(base64);
        // 3. Enrich each name via Places API
        const enriched: { name: string; lat: number; lng: number; address: string; type: SpotType; hours: string; rating: number | null }[] = [];
        for (const name of placeNames.slice(0, 8)) {
          const place = await lookupPlace(name, trip.country);
          if (place) {
            enriched.push({
              name: place.name,
              lat: place.lat,
              lng: place.lng,
              address: place.address,
              type: placeTypeToSpotType(place.types),
              hours: place.hours,
              rating: place.rating,
            });
          }
        }
        // 4. Persist spots (auto-clustering happens later in /calendar)
        for (const s of enriched) {
          await addSpot(tripId, {
            name: s.name,
            lat: s.lat,
            lng: s.lng,
            type: s.type,
            address: s.address,
            hours: s.hours,
            rating: s.rating ?? undefined,
            source: 'ocr',
          });
        }
        setFiles((prev) =>
          prev.map((x, idx) =>
            idx === i ? { ...x, status: 'done', spots: enriched.map((e) => e.name) } : x,
          ),
        );
      } catch (err) {
        console.error(err);
        setFiles((prev) =>
          prev.map((x, idx) => (idx === i ? { ...x, status: 'error', error: 'วิเคราะห์ไม่สำเร็จ' } : x)),
        );
      }
    }

    setUploading(false);
    setUploaded(true);
    toast('AI ดึงข้อมูลสำเร็จ! 🎉', 'success');
  };

  const totalSpots = files.reduce((a, f) => a + f.spots.length, 0);

  return (
    <>

      <div className="app-page">
        {/* ── Header ─────────────────────────────────── */}
        <div
          style={{
            padding: '16px 20px 14px',
            background: 'white',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                padding: 2,
              }}
              aria-label="กลับ"
            >
              <IconChevLeft />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                สร้างทริปใหม่
              </p>
              <h1
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: 'var(--font-head)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {trip?.title ?? 'กำลังโหลด...'}
              </h1>
            </div>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STEPS.map((s, i) => (
              <StepCircle key={s} label={s} idx={i} currentIdx={1} isLast={i === STEPS.length - 1} />
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 16px' }}>
          {/* ── Title & subtitle ───────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-head)', marginBottom: 6 }}>
              อัปโหลดภาพสถานที่
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              อัปโหลดภาพจาก Google Maps หรือภาพที่มีชื่อสถานที่ — AI จะดึงข้อมูลและระบุตำแหน่งให้อัตโนมัติ
            </p>
          </div>

          {/* ── Drop zone ──────────────────────────── */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 16,
              padding: '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--bg)',
              transition: 'all .2s',
              marginBottom: 16,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                color: 'var(--text-muted)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="26" height="26">
                <polyline points="16 16 12 12 8 16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
              {dragging ? 'วางภาพที่นี่เลย!' : 'ลากวางภาพ หรือกดเพื่อเลือก'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>รองรับ PNG, JPG, WEBP</p>
          </div>

          {/* ── File list ──────────────────────────── */}
          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {files.map((f) => (
                <FileRow key={f.id} file={f} onRemove={() => removeFile(f.id)} />
              ))}
            </div>
          )}

          {/* ── Actions ────────────────────────────── */}
          {!uploaded ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn-primary"
                style={{
                  width: '100%',
                  background: files.length ? 'var(--accent)' : 'var(--border)',
                  cursor: files.length ? 'pointer' : 'default',
                }}
                disabled={!files.length || uploading}
                onClick={handleProcess}
              >
                {uploading ? (
                  <>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin .7s linear infinite',
                      }}
                    />
                    AI กำลังวิเคราะห์...
                  </>
                ) : (
                  <>✨ วิเคราะห์ด้วย AI ({files.length} ภาพ)</>
                )}
              </button>
              <button
                onClick={() => router.push(`/trips/${tripId}/plan`)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  background: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                ข้ามขั้นตอนนี้
              </button>
            </div>
          ) : (
            <div>
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1.5px solid #BBF7D0',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 24 }}>🎉</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#065F46' }}>วิเคราะห์สำเร็จ!</p>
                  <p style={{ fontSize: 13, color: '#047857' }}>
                    พบ {totalSpots} สถานที่จาก {files.length} ภาพ
                  </p>
                </div>
              </div>
              <button
                className="btn-primary"
                style={{ width: '100%' }}
                onClick={() => router.push(`/trips/${tripId}/plan`)}
              >
                ไปจัดแผน →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   StepCircle — circle + connector line
   ───────────────────────────────────────────────────────────── */
function StepCircle({
  label,
  idx,
  currentIdx,
  isLast,
}: {
  label: string;
  idx: number;
  currentIdx: number;
  isLast: boolean;
}) {
  const done = idx < currentIdx;
  const active = idx === currentIdx;
  const bg = done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--border)';
  const labelColor = active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--text-muted)';

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: bg,
            color: idx <= currentIdx ? 'white' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          {done ? <IconCheck width={12} height={12} /> : idx + 1}
        </div>
        <span
          style={{
            fontSize: 9,
            color: labelColor,
            fontWeight: idx <= currentIdx ? 700 : 400,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </div>
      {!isLast && (
        <div
          style={{
            height: 2,
            flex: 1,
            background: done ? 'var(--green)' : 'var(--border)',
            marginBottom: 16,
            maxWidth: 24,
          }}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   FileRow — one row in the upload list
   ───────────────────────────────────────────────────────────── */
function FileRow({ file, onRemove }: { file: UploadFile; onRemove: () => void }) {
  const isDone = file.status === 'done';
  const isError = file.status === 'error';
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${isDone ? '#BBF7D0' : isError ? '#FECACA' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        transition: 'border-color .3s',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          flexShrink: 0,
          overflow: 'hidden',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={file.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {file.file.name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: file.spots.length ? 6 : 0 }}>
          {file.size}
        </p>

        {file.status === 'processing' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 14,
                border: '2px solid var(--accent)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin .7s linear infinite',
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
              AI กำลังวิเคราะห์...
            </span>
          </div>
        )}

        {file.status === 'done' && file.spots.length > 0 && (
          <div>
            <p style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, marginBottom: 5 }}>
              ✅ พบ {file.spots.length} สถานที่
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {file.spots.map((s, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: '#D1FAE5',
                    color: '#065F46',
                    fontWeight: 500,
                  }}
                >
                  📍{s}
                </span>
              ))}
            </div>
          </div>
        )}

        {isError && (
          <p style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
            ⚠️ {file.error || 'เกิดข้อผิดพลาด'}
          </p>
        )}
      </div>
      <button
        onClick={onRemove}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          padding: 2,
          display: 'flex',
          flexShrink: 0,
        }}
        aria-label="ลบภาพ"
      >
        <IconX />
      </button>
    </div>
  );
}
