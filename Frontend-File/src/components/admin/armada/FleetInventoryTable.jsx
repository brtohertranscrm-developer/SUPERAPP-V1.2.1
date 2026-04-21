import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Check,
  AlertTriangle, Wrench, Calendar, Clock, Info,
  Bike, ChevronDown, Loader2, RefreshCw
} from 'lucide-react';

// [FIX P8] Hapus UNITS dan INITIAL_BOOKINGS hardcoded
// Data sekarang diambil dari API
const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  booked:  { bg: '#16a34a', text: '#fff',         label: 'Tersewa' },
  trouble: { bg: '#dc2626', text: '#fff',         label: 'Trouble' },
  extend:  { bg: '#d97706', text: '#fff',         label: 'Extend' },
  ojk:     { bg: '#2563eb', text: '#fff',         label: 'OJK/Korporat' },
  partial: { bg: '#0d9488', text: '#fff',         label: 'Check-in/out' },
  free:    { bg: 'transparent', text: '#94a3b8', label: 'Kosong', border: '#e2e8f0' },
  blocked: { bg: '#374151', text: '#fff',         label: 'Diblokir' },
};

const STATUS_OPTIONS = ['booked','ojk','partial','extend','trouble','blocked','free'];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getDayOfWeek(year, month, day) { return new Date(year, month, day).getDay(); }
const DAY_LABELS  = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function getWeekStart(year, month, dayOfMonth) {
  const d = new Date(year, month, dayOfMonth);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return start;
}
function getWeekDays(startDate) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d;
  });
}
function fmtKey(date, unitId) {
  const y  = date.getFullYear();
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${unitId}_${y}-${m}-${dd}`;
}
function fmtDateKey(date) {
  const y  = date.getFullYear();
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ─── Mini modal ───────────────────────────────────────────────────────────────
function BookingModal({ cell, onClose, onSave, onDelete }) {
  const isNew = !cell.booking;
  const [form, setForm] = useState({
    name:   cell.booking?.name   || '',
    status: cell.booking?.status || 'booked',
    time:   cell.booking?.time   || '',
    notes:  cell.booking?.notes  || '',
  });

  const handleSave = () => {
    if (!form.name.trim() && form.status !== 'free' && form.status !== 'blocked') {
      alert('Nama penyewa wajib diisi.');
      return;
    }
    onSave(form);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400, boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ background: '#0f172a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
              {isNew ? 'Tambah Booking Manual' : 'Edit Booking'}
            </p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{cell.unitName}</p>
            <p style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>{cell.plat}</p>
            <p style={{ color: '#78816e', fontSize: 11, marginTop: 4 }}>{cell.dayLabel}, {cell.dateStr}</p>
          </div>
          <button onClick={onClose} style={{ color: '#64748b', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Status</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                  style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '2px solid', borderColor: form.status === s ? STATUS[s].bg || '#94a3b8' : '#e2e8f0', background: form.status === s ? (STATUS[s].bg || '#f1f5f9') : '#f8fafc', color: form.status === s ? (STATUS[s].text || '#374151') : '#64748b' }}>
                  {STATUS[s].label}
                </button>
              ))}
            </div>
          </div>

          {form.status !== 'free' && form.status !== 'blocked' && (
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Nama Penyewa</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Budi Santoso"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
                onFocus={e => e.target.style.borderColor = '#78081C'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Jam Check-in</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Catatan</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="opsional"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {!isNew && (
              <button onClick={onDelete} style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #fee2e2', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                Hapus
              </button>
            )}
            <button onClick={handleSave} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#78081C', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={15} /> Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FleetInventoryTable() {
  const today = new Date();
  const [viewMode, setViewMode]           = useState('week');
  const [currentYear, setCurrentYear]     = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth]   = useState(today.getMonth());
  const [weekStart, setWeekStart]         = useState(() => getWeekStart(today.getFullYear(), today.getMonth(), today.getDate()));
  const [bookings, setBookings]           = useState({});
  const [modalCell, setModalCell]         = useState(null);
  const [filterType, setFilterType]       = useState('Semua');
  const [expandedTypes, setExpandedTypes] = useState({});
  const [isMobile, setIsMobile]           = useState(window.innerWidth < 768);
  const tableRef = useRef(null);

  // [FIX P8] State untuk data dari API
  const [units, setUnits]         = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // ── Resize listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // [FIX P8] Fetch units (motor_units) dari API
  const fetchUnits = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/motor-units-all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Transform format dari DB ke format yang dipakai komponen
        // DB: { id, motor_id, plate_number, status, condition_notes, motor_name, motor_category }
        // Komponen: { id, type, name, plat }
        const transformed = data.data.map(u => ({
          id:   u.id,
          type: u.motor_category || u.motor_name || 'Lainnya',
          name: u.motor_name || 'Motor',
          plat: u.plate_number,
          dbStatus: u.status, // RDY, SVC, OUT dari DB
        }));
        setUnits(transformed);
        setLoadError('');
      } else {
        setLoadError(data.error || 'Gagal memuat data unit.');
      }
    } catch {
      setLoadError('Tidak dapat terhubung ke server.');
    }
  }, []);

  // [FIX P8] Fetch bookings aktif dari API dan konversi ke format calendar
  const fetchBookings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/bookings?item_type=motor`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Konversi array booking ke format key-value calendar
        // Format key: `${unit_id}_${YYYY-MM-DD}`
        const bookingMap = {};
        data.data.forEach(b => {
          if (!b.unit_id || !b.start_date || !b.end_date) return;

          // Tentukan status visual dari booking status
          let visualStatus = 'booked';
          if (b.status === 'cancelled') return; // skip cancelled
          if (b.payment_status === 'unpaid' && b.status === 'active') visualStatus = 'extend';
          if (b.status === 'pending') visualStatus = 'booked';

          // Isi semua hari antara start_date dan end_date
          const start = new Date(b.start_date);
          const end   = new Date(b.end_date);
          const cur   = new Date(start);

          while (cur <= end) {
            const key = `${b.unit_id}_${fmtDateKey(cur)}`;
            bookingMap[key] = {
              name:     b.user_name || 'Penyewa',
              status:   visualStatus,
              time:     b.start_date === fmtDateKey(cur) ? (b.checkin_time || '') : '',
              notes:    b.order_id,
              order_id: b.order_id,
            };
            cur.setDate(cur.getDate() + 1);
          }
        });
        setBookings(bookingMap);
      }
    } catch {
      // Bookings gagal dimuat — calendar tetap tampil, hanya kosong
      console.warn('FleetInventoryTable: gagal memuat bookings');
    }
  }, []);

  // [FIX P8] Load data saat mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchUnits();
      await fetchBookings();
      setIsLoading(false);
    };
    load();
  }, [fetchUnits, fetchBookings]);

  // ── Filtered units ──────────────────────────────────────────────────────────
  const types = useMemo(() => [...new Set(units.map(u => u.type))], [units]);
  const filteredUnits = useMemo(() =>
    filterType === 'Semua' ? units : units.filter(u => u.type === filterType),
    [filterType, units]
  );

  // ── Week navigation ─────────────────────────────────────────────────────────
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToToday = () => {
    setWeekStart(getWeekStart(today.getFullYear(), today.getMonth(), today.getDate()));
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // ── Month navigation ────────────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); };

  // ── Cell click ──────────────────────────────────────────────────────────────
  const handleCellClick = (unit, date) => {
    const key = fmtKey(date, unit.id);
    setModalCell({
      key,
      unitId:   unit.id,
      unitName: unit.name,
      plat:     unit.plat,
      dateStr:  `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
      dayLabel: DAY_LABELS[date.getDay()],
      booking:  bookings[key] || null,
    });
  };

  // [FIX P8] handleSave: update local state dulu, biarkan admin klik "Refresh" untuk sync ke DB
  // Karena fleet calendar adalah manual booking tambahan, tidak perlu auto-POST ke booking API
  const handleSave = (form) => {
    if (form.status === 'free') {
      setBookings(b => { const n = { ...b }; delete n[modalCell.key]; return n; });
    } else {
      setBookings(b => ({ ...b, [modalCell.key]: form }));
    }
    setModalCell(null);
  };

  const handleDelete = () => {
    setBookings(b => { const n = { ...b }; delete n[modalCell.key]; return n; });
    setModalCell(null);
  };

  // ── Metrics ─────────────────────────────────────────────────────────────────
  const todayKey    = fmtDateKey(today);
  const todayBooked = units.filter(u => {
    const k = `${u.id}_${todayKey}`;
    return bookings[k] && ['booked','ojk','extend','partial'].includes(bookings[k].status);
  }).length;
  const todayTrouble = units.filter(u => bookings[`${u.id}_${todayKey}`]?.status === 'trouble').length;
  const todayFree    = units.length - todayBooked - todayTrouble;

  const weekOcc = useMemo(() => {
    let booked = 0, total = 0;
    weekDays.forEach(d => {
      units.forEach(u => {
        total++;
        const k = fmtKey(d, u.id);
        if (bookings[k] && bookings[k].status !== 'free') booked++;
      });
    });
    return total > 0 ? Math.round((booked / total) * 100) : 0;
  }, [weekDays, bookings, units]);

  // ── Cell renderer ────────────────────────────────────────────────────────────
  const renderCell = (unit, date, isToday) => {
    const key = fmtKey(date, unit.id);
    const b   = bookings[key];
    const st  = b ? STATUS[b.status] || STATUS.free : STATUS.free;
    const isEmpty = !b || b.status === 'free';

    return (
      <td key={date.toISOString()} style={{ padding: '3px 4px', verticalAlign: 'middle' }}>
        <div
          onClick={() => handleCellClick(unit, date)}
          title={b ? `${b.name}${b.time ? ' · ' + b.time : ''}` : 'Kosong – klik untuk tambah booking'}
          style={{ minHeight: isMobile ? 40 : 52, borderRadius: 6, padding: isMobile ? '4px 5px' : '5px 7px', cursor: 'pointer', background: isEmpty ? (isToday ? 'rgba(120,8,28,0.04)' : st.bg) : st.bg, border: isEmpty ? `1.5px dashed ${isToday ? '#78081C40' : '#e2e8f0'}` : '1.5px solid transparent', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'opacity 0.15s, transform 0.1s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.82'; e.currentTarget.style.transform = 'scale(1.03)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {!isEmpty && (
            <>
              <span style={{ fontSize: isMobile ? 9 : 11, fontWeight: 700, color: st.text, lineHeight: 1.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: isMobile ? 1 : 2, WebkitBoxOrient: 'vertical' }}>
                {b.name}
              </span>
              {b.time && !isMobile && (
                <span style={{ fontSize: 9, color: st.text, opacity: 0.8, fontWeight: 600 }}>{b.time}</span>
              )}
            </>
          )}
          {isEmpty && <span style={{ fontSize: 16, textAlign: 'center', opacity: 0.18, color: isToday ? '#78081C' : '#94a3b8', lineHeight: 1 }}>+</span>}
        </div>
      </td>
    );
  };

  // ── Group units by type ────────────────────────────────────────────────────
  const groupedUnits = useMemo(() => {
    const groups = {};
    filteredUnits.forEach(u => {
      if (!groups[u.type]) groups[u.type] = [];
      groups[u.type].push(u);
    });
    return groups;
  }, [filteredUnits]);

  const cardStyle       = { background: '#fff', borderRadius: 16, border: '1px solid #e8eaf0', overflow: 'hidden' };
  const headerCellStyle = { fontSize: 10, fontWeight: 700, color: '#64748b', textAlign: 'center', padding: isMobile ? '6px 3px' : '8px 4px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };

  const weekEnd   = weekDays[6];
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getDate()}–${weekEnd.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    : `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  // ── Mobile card view ────────────────────────────────────────────────────────
  const MobileWeekCards = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Object.entries(groupedUnits).map(([type, typeUnits]) => (
        <div key={type}>
          <div onClick={() => setExpandedTypes(e => ({ ...e, [type]: !e[type] }))}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 10, cursor: 'pointer', marginBottom: expandedTypes[type] === false ? 0 : 6, userSelect: 'none' }}>
            <Bike size={13} style={{ color: '#64748b' }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 }}>{type}</span>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{typeUnits.length} unit</span>
            <ChevronDown size={13} style={{ color: '#94a3b8', transform: expandedTypes[type] === false ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </div>

          {expandedTypes[type] !== false && typeUnits.map(unit => (
            <div key={unit.id} style={{ ...cardStyle, marginBottom: 6 }}>
              <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{unit.name}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', marginLeft: 8 }}>{unit.plat}</span>
                </div>
              </div>
              <div style={{ overflowX: 'auto', padding: '8px 10px', display: 'flex', gap: 6 }}>
                {weekDays.map(date => {
                  const isToday = fmtDateKey(date) === todayKey;
                  const key = fmtKey(date, unit.id);
                  const b   = bookings[key];
                  const st  = b ? STATUS[b.status] || STATUS.free : STATUS.free;
                  const isEmpty = !b || b.status === 'free';
                  return (
                    <div key={date.toISOString()} onClick={() => handleCellClick(unit, date)}
                      style={{ minWidth: 56, borderRadius: 8, padding: '6px 5px', cursor: 'pointer', background: isEmpty ? (isToday ? '#fff5f5' : '#f8fafc') : st.bg, border: `1.5px ${isEmpty ? 'dashed' : 'solid'} ${isEmpty ? (isToday ? '#78081C40' : '#e2e8f0') : 'transparent'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: isToday ? '#78081C' : '#94a3b8', textTransform: 'uppercase' }}>{DAY_LABELS[date.getDay()]}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: isToday ? '#78081C' : (isEmpty ? '#374151' : st.text) }}>{date.getDate()}</span>
                      {!isEmpty && <span style={{ fontSize: 8, fontWeight: 700, color: st.text, textAlign: 'center', lineHeight: 1.2, maxWidth: 50, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{b.name.split(' ')[0]}</span>}
                      {isEmpty  && <span style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1 }}>+</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  // ── Desktop table view ──────────────────────────────────────────────────────
  const DesktopTable = ({ days }) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 156 }} />
          {days.map((_, i) => <col key={i} />)}
        </colgroup>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
            <th style={{ ...headerCellStyle, textAlign: 'left', paddingLeft: 14, width: 156 }}>Unit / Plat</th>
            {days.map(date => {
              const isToday = fmtDateKey(date) === todayKey;
              return (
                <th key={date.toISOString()} style={{ ...headerCellStyle, color: isToday ? '#78081C' : '#64748b', fontWeight: isToday ? 800 : 700, background: isToday ? '#fff5f5' : 'transparent' }}>
                  <div>{DAY_LABELS[date.getDay()]}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: isToday ? '#78081C' : '#1e293b' }}>{date.getDate()}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedUnits).map(([type, typeUnits]) => (
            <React.Fragment key={type}>
              <tr>
                <td colSpan={days.length + 1} style={{ padding: '5px 14px', background: '#f1f5f9', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}>
                  {type} <span style={{ color: '#94a3b8', fontWeight: 600 }}>({typeUnits.length} unit)</span>
                </td>
              </tr>
              {typeUnits.map((unit, ri) => (
                <tr key={unit.id} style={{ borderBottom: ri === typeUnits.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '4px 8px 4px 14px', borderRight: '1.5px solid #e2e8f0', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>{unit.name}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', marginTop: 1 }}>{unit.plat}</div>
                  </td>
                  {days.map(date => renderCell(unit, date, fmtDateKey(date) === todayKey))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Month view ──────────────────────────────────────────────────────────────
  const MonthView = () => {
    const days = Array.from({ length: daysInMonth }, (_, i) => new Date(currentYear, currentMonth, i + 1));
    if (isMobile) {
      return (
        <div style={{ padding: '0 4px' }}>
          <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>Tap hari di tabel mingguan untuk edit booking · Mode bulan hanya untuk overview</p>
          {Object.entries(groupedUnits).map(([type, typeUnits]) => (
            <div key={type} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, paddingLeft: 2 }}>{type}</div>
              <div style={{ ...cardStyle, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...headerCellStyle, textAlign: 'left', paddingLeft: 10, width: 90, whiteSpace: 'nowrap' }}>Plat</th>
                      {days.slice(0, 31).map(d => (
                        <th key={d.getDate()} style={{ ...headerCellStyle, padding: '6px 2px', fontSize: 9, color: fmtDateKey(d) === todayKey ? '#78081C' : '#94a3b8', fontWeight: fmtDateKey(d) === todayKey ? 800 : 600 }}>{d.getDate()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {typeUnits.map(unit => (
                      <tr key={unit.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '4px 10px', fontSize: 9, fontFamily: 'monospace', color: '#64748b', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' }}>{unit.plat}</td>
                        {days.map(date => {
                          const key = fmtKey(date, unit.id);
                          const b   = bookings[key];
                          const bg  = b ? STATUS[b.status]?.bg || '#e2e8f0' : 'transparent';
                          const isToday = fmtDateKey(date) === todayKey;
                          return (
                            <td key={date.getDate()} style={{ padding: '3px 2px', textAlign: 'center' }}>
                              <div onClick={() => handleCellClick(unit, date)} title={b?.name || 'Kosong'}
                                style={{ width: 14, height: 14, borderRadius: 3, margin: '0 auto', background: b ? bg : isToday ? '#fee2e2' : '#f1f5f9', cursor: 'pointer', border: isToday && !b ? '1px dashed #78081C60' : 'none', transition: 'opacity 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return <DesktopTable days={days} />;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", maxWidth: 1200, margin: '0 auto', padding: isMobile ? '16px 12px' : '24px 20px' }}>

      {/* [FIX P8] Loading state */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 0', color: '#64748b' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Memuat data armada...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* [FIX P8] Error state */}
      {!isLoading && loadError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Gagal memuat data unit</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#ef4444' }}>{loadError}</p>
          </div>
          <button onClick={() => { setIsLoading(true); fetchUnits().then(() => setIsLoading(false)); }}
            style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={12} /> Coba Lagi
          </button>
        </div>
      )}

      {!isLoading && !loadError && (
        <>
          {/* ── Metrics ──────────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: isMobile ? 8 : 12, marginBottom: 16 }}>
            {[
              { label: 'Tersewa hari ini', value: todayBooked,   color: '#16a34a' },
              { label: 'Kosong',           value: todayFree,     color: '#64748b' },
              { label: 'Trouble',          value: todayTrouble,  color: '#dc2626' },
              { label: 'Total armada',     value: units.length,  color: '#0f172a' },
            ].map(m => (
              <div key={m.label} style={{ background: '#fff', borderRadius: 12, padding: isMobile ? '12px' : '14px 18px', border: '1px solid #e8eaf0' }}>
                <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 600 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* ── Occupancy bar ─────────────────────────────────────────────────── */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', border: '1px solid #e8eaf0', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Tingkat hunian minggu ini</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>{weekOcc}%</span>
                {/* [FIX P8] Tombol refresh data */}
                <button onClick={() => { fetchBookings(); fetchUnits(); }} title="Refresh data dari server"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, display: 'flex', alignItems: 'center' }}>
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${weekOcc}%`, background: '#16a34a', borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
          </div>

          {/* ── Controls ──────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, gap: 2 }}>
              {['week', 'month'].map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s', background: viewMode === v ? '#fff' : 'transparent', color: viewMode === v ? '#1e293b' : '#64748b', boxShadow: viewMode === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                  {v === 'week' ? 'Mingguan' : 'Bulanan'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={viewMode === 'week' ? prevWeek : prevMonth} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronLeft size={14} /></button>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', minWidth: isMobile ? 140 : 200, textAlign: 'center' }}>
                {viewMode === 'week' ? weekLabel : `${MONTH_NAMES[currentMonth]} ${currentYear}`}
              </span>
              <button onClick={viewMode === 'week' ? nextWeek : nextMonth} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronRight size={14} /></button>
            </div>

            <button onClick={goToToday} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={13} /> Hari ini
            </button>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginLeft: 'auto' }}>
              {['Semua', ...types].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px solid', borderColor: filterType === t ? '#78081C' : '#e2e8f0', background: filterType === t ? '#78081C' : '#fff', color: filterType === t ? '#fff' : '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* ── Legend ────────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {Object.entries(STATUS).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: v.bg || 'transparent', border: v.border ? `1.5px dashed ${v.border}` : 'none' }} />
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{v.label}</span>
              </div>
            ))}
          </div>

          {/* ── Table ─────────────────────────────────────────────────────────── */}
          <div ref={tableRef} style={{ ...cardStyle }}>
            {units.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <Bike size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Belum ada unit motor terdaftar.</p>
                <p style={{ margin: '4px 0 0', fontSize: 11 }}>Tambahkan unit di menu Armada terlebih dahulu.</p>
              </div>
            ) : (
              viewMode === 'week'
                ? isMobile ? <div style={{ padding: '10px 8px' }}><MobileWeekCards /></div> : <DesktopTable days={weekDays} />
                : <MonthView />
            )}
          </div>

          <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 8, fontWeight: 600 }}>
            Klik sel untuk tambah atau edit booking · Data disinkronkan dari sistem booking
          </p>
        </>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {modalCell && (
        <BookingModal cell={modalCell} onClose={() => setModalCell(null)} onSave={handleSave} onDelete={handleDelete} />
      )}
    </div>
  );
}
