import React from 'react';
import { Bike, Calendar, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export default function FleetInventoryHeader({
  canManage,
  isMobile,
  todayBooked,
  todayFree,
  todayMaint,
  totalUnits,
  weekOcc,
  refreshAll,
  viewMode,
  setViewMode,
  prevWeek,
  nextWeek,
  prevMonth,
  nextMonth,
  weekLabel,
  monthLabel,
  goToToday,
  types,
  filterType,
  setFilterType,
  cstatus,
}) {
  return (
    <>
      {!canManage && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 10,
            padding: '9px 14px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 15 }}>👁️</span>
          <div>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>Mode Pantau</span>
            <span style={{ fontSize: 11, color: '#a16207', marginLeft: 8 }}>
              Kamu dapat melihat jadwal armada, tapi tidak bisa mengubah data.
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`,
          gap: isMobile ? 8 : 12,
          marginBottom: 16,
        }}
      >
        {[
          { label: 'Tersewa hari ini', value: todayBooked, color: '#16a34a' },
          { label: 'Kosong', value: todayFree, color: '#64748b' },
          { label: 'Maintenance', value: todayMaint, color: '#dc2626' },
          { label: 'Total armada', value: totalUnits, color: '#0f172a' },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: isMobile ? '12px' : '14px 18px',
              border: '1px solid #e8eaf0',
            }}
          >
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: m.color, lineHeight: 1 }}>
              {m.value}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 600 }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '12px 16px',
          border: '1px solid #e8eaf0',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Tingkat hunian minggu ini</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>{weekOcc}%</span>
            <button
              onClick={refreshAll}
              title="Refresh"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, display: 'flex' }}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${weekOcc}%`, background: '#16a34a', borderRadius: 4, transition: 'width 0.5s' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, gap: 2 }}>
          {['week', 'month'].map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                transition: 'all 0.15s',
                background: viewMode === v ? '#fff' : 'transparent',
                color: viewMode === v ? '#1e293b' : '#64748b',
                boxShadow: viewMode === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {v === 'week' ? 'Mingguan' : 'Bulanan'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={viewMode === 'week' ? prevWeek : prevMonth}
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', minWidth: isMobile ? 140 : 200, textAlign: 'center' }}>
            {viewMode === 'week' ? weekLabel : monthLabel}
          </span>
          <button
            onClick={viewMode === 'week' ? nextWeek : nextMonth}
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <button
          onClick={goToToday}
          style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Calendar size={13} /> Hari ini
        </button>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginLeft: 'auto' }}>
          {['Semua', ...types].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: '1.5px solid',
                borderColor: filterType === t ? '#78081C' : '#e2e8f0',
                background: filterType === t ? '#78081C' : '#fff',
                color: filterType === t ? '#fff' : '#64748b',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        {Object.entries(cstatus)
          .filter(([k]) => k !== 'free')
          .map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: k === 'mixed' ? 'repeating-linear-gradient(45deg,#d97706,#d97706 3px,#dc2626 3px,#dc2626 6px)' : v.bg,
                }}
              />
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{v.label}</span>
            </div>
          ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, border: '1.5px dashed #e2e8f0' }} />
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Kosong</span>
        </div>
      </div>
    </>
  );
}

