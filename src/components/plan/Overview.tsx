'use client';

import { Trip, Spot, Group, DayMeta, SPOT_TYPE_CONFIG } from '@/types';
import { calculateTotalDistance } from '@/lib/route-optimizer';
import { MapPin, Check, Route, Calendar, Hotel, ChevronRight } from 'lucide-react';
import { GROUP_COLORS } from '@/types';

interface OverviewProps {
  trip: Trip;
  spots: Spot[];
  groups: Group[];
  dayMetas: DayMeta[];
  onDaySelect: (dayIdx: number) => void;
}

function guessArea(daySpots: Spot[]): string {
  if (daySpots.length === 0) return '';
  const areas = daySpots
    .map(s => s.address || '').filter(Boolean)
    .map(addr => {
      const parts = addr.split(',').map(p => p.trim());
      return parts.length >= 3 ? parts[parts.length - 3] : parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    }).filter(Boolean);
  const freq: Record<string, number> = {};
  areas.forEach(a => { freq[a] = (freq[a] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return '';
  return sorted.length === 1 ? sorted[0][0] : `${sorted[0][0]}, ${sorted[1][0]}`;
}

const DAYS_OF_WEEK_TH = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
const MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export default function Overview({ trip, spots, groups, dayMetas, onDaySelect }: OverviewProps) {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

  const checkedCount = spots.filter(s => s.checked).length;
  const totalDistance = calculateTotalDistance(spots);

  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dayGroups = groups.filter(g => g.assignedDay === i);
    const daySpotIds = dayGroups.flatMap(g => g.spotIds);
    const daySpots = spots.filter(s => daySpotIds.includes(s.id));
    const dayChecked = daySpots.filter(s => s.checked).length;
    const meta = dayMetas.find(m => m.dayIdx === i);
    const area = meta?.area || guessArea(daySpots);
    return { date, dayIdx: i, spots: daySpots, checked: dayChecked, groups: dayGroups, area, meta };
  });

  return (
    <div className="space-y-5">

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          { icon: <Calendar size={16}/>, label: 'วัน', value: totalDays, bg: '#EEF2FF', color: '#4F46E5' },
          { icon: <MapPin size={16}/>, label: 'สถานที่', value: spots.length, bg: '#F0FDF4', color: '#059669' },
          { icon: <Check size={16}/>, label: 'เยี่ยมแล้ว', value: checkedCount, bg: '#FEF3C7', color: '#D97706' },
          { icon: <Route size={16}/>, label: 'กม.', value: `${totalDistance.toFixed(0)}`, bg: '#FEE2E2', color: '#DC2626' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-3 text-center border border-[var(--border)]"
            style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="w-8 h-8 rounded-xl mx-auto flex items-center justify-center mb-1.5"
              style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <p className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-head)' }}>{s.value}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Day cards ── */}
      <div className="space-y-3">
        {days.map(day => {
          const color = GROUP_COLORS[day.dayIdx % GROUP_COLORS.length];
          const progress = day.spots.length > 0 ? (day.checked / day.spots.length) * 100 : 0;
          const dowTh = DAYS_OF_WEEK_TH[day.date.getDay()];
          const dateTh = `${dowTh} ${day.date.getDate()} ${MONTHS_SHORT[day.date.getMonth()]}`;

          // Get unique spot types for chips
          const typeChips = [...new Set(day.spots.map(s => s.type))].slice(0, 3);

          return (
            <div
              key={day.dayIdx}
              onClick={() => onDaySelect(day.dayIdx)}
              className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden cursor-pointer hover:shadow-md transition-all relative"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              {/* Top color bar */}
              <div className="h-1.5 w-full" style={{ background: color }}/>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        วันที่ {day.dayIdx + 1}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{dateTh}</span>
                    </div>
                    <h3 className="font-bold text-[var(--text-primary)] leading-tight"
                      style={{ fontFamily: 'var(--font-head)', fontSize: 15 }}>
                      {day.area || `Day ${day.dayIdx + 1}`}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${color}18`, color }}>
                      {day.checked}/{day.spots.length} จุด
                    </span>
                    <ChevronRight size={16} className="text-[var(--text-muted)]"/>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress-bar mb-3">
                  <div className="progress-fill" style={{ width: `${progress}%`, background: color }}/>
                </div>

                {/* Spot type chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  {typeChips.map(type => {
                    const tc = SPOT_TYPE_CONFIG[type] || SPOT_TYPE_CONFIG.other;
                    return (
                      <span key={type} className="type-chip"
                        style={{ background: `${tc.color}18`, color: tc.color }}>
                        {tc.emoji} {tc.label}
                      </span>
                    );
                  })}
                  {day.spots.length === 0 && (
                    <span className="text-xs text-[var(--text-muted)]">ยังไม่มีสถานที่</span>
                  )}
                </div>

                {/* Hotel row */}
                {day.meta?.hotelName && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                    <Hotel size={13} className="text-[var(--text-muted)] flex-shrink-0"/>
                    <span className="text-xs text-[var(--text-secondary)] truncate">{day.meta.hotelName}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
