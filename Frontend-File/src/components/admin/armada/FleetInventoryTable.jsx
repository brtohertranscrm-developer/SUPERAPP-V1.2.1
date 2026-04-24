import React, { useState, useMemo, useRef, useEffect, useCallback, useContext } from 'react';
import {
  ChevronLeft, ChevronRight, X, Plus, Wrench,
  AlertTriangle, Calendar, Bike, ChevronDown, Loader2, RefreshCw, Trash2
} from 'lucide-react';
import { apiFetch } from '../../../utils/api';
import { AuthContext } from '../../../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
const DAY_LABELS  = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function getWeekStart(y, m, d) {
  const dt = new Date(y, m, d);
  dt.setDate(dt.getDate() - dt.getDay());
  return dt;
}
function getWeekDays(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d;
  });
}
function fmtDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function fmtKey(date, unitId) { return `${unitId}_${fmtDateKey(date)}`; }
function addDays(k, n) { const d = new Date(`${k}T00:00:00`); d.setDate(d.getDate()+n); return fmtDateKey(d); }
function parseDt(v) {
  if (!v) return null;
  const s = String(v).trim().replace(' ','T');
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function toHM(dt) {
  if (!dt) return '';
  return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}
function toMin(hm) {
  const m = String(hm||'').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1],10)*60+parseInt(m[2],10);
}
function minToHM(min) {
  const m = Math.max(0,Math.min(1439,min||0));
  return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
}

// ─── Cell status ──────────────────────────────────────────────────────────────
// green=1 tamu, orange=2+ tamu, red=maintenance, striped=keduanya
const CSTATUS = {
  free:        { bg: 'transparent', text: '#94a3b8', label: 'Kosong' },
  single:      { bg: '#16a34a',     text: '#fff',    label: '1 Booking' },
  double:      { bg: '#d97706',     text: '#fff',    label: '2+ Booking' },
  maintenance: { bg: '#dc2626',     text: '#fff',    label: 'Maintenance' },
  mixed:       { bg: '#d97706',     text: '#fff',    label: 'Booking + Servis' },
};

function getCellStatus(cell) {
  if (!cell) return 'free';
  const { rentalCount, hasBlock } = cell;
  if (rentalCount === 0 && !hasBlock) return 'free';
  if (rentalCount === 0 && hasBlock)  return 'maintenance';
  if (rentalCount >= 2 && hasBlock)   return 'mixed';
  if (rentalCount >= 2)               return 'double';
  if (hasBlock)                       return 'mixed';
  return 'single';
}

// ─── CellDetailModal ──────────────────────────────────────────────────────────
function CellDetailModal({ cell, onClose, onRefresh, canManage }) {
  const { unitId, unitName, plat, dateKey, dateStr, dayLabel, cellData } = cell;
  const rentals = cellData?.rentals || [];
  const blocks  = cellData?.blocks  || [];

  const [showAddForm,   setShowAddForm]   = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', startHM: '08:00', endHM: '18:00', notes: '' });
  const [blockForm, setBlockForm] = useState({ reason: 'Servis berkala', startHM: '08:00', endHM: '17:00' });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError]     = useState('');

  const buildUrl = (path) => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    return `${base}${path}`;
  };
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleAddManual = async () => {
    setError('');
    if (!form.name.trim()) { setError('Nama tamu wajib diisi.'); return; }
    const startMin = toMin(form.startHM);
    const endMin   = toMin(form.endHM);
    if (startMin === null || endMin === null || endMin <= startMin) {
      setError('Jam kembali harus lebih dari jam ambil.'); return;
    }
    setSaving(true);
    try {
      const startAt = `${dateKey} ${form.startHM}:00`;
      const endAt   = `${dateKey} ${form.endHM}:00`;
      const res = await fetch(buildUrl('/api/admin/units/blocks'), {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: unitId,
          start_at: startAt,
          end_at: endAt,
          reason: `Rental: ${form.name}`,
          block_type: 'rental_manual',
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          notes: form.notes.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menyimpan.');
      setForm({ name: '', phone: '', startHM: '08:00', endHM: '18:00', notes: '' });
      setShowAddForm(false);
      onRefresh();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleAddBlock = async () => {
    setError('');
    if (!blockForm.reason.trim()) { setError('Alasan wajib diisi.'); return; }
    const startMin = toMin(blockForm.startHM);
    const endMin   = toMin(blockForm.endHM);
    if (startMin === null || endMin === null || endMin <= startMin) {
      setError('Jam selesai harus lebih dari jam mulai.'); return;
    }
    setSaving(true);
    try {
      const res = await fetch(buildUrl('/api/admin/units/blocks'), {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: unitId,
          start_at: `${dateKey} ${blockForm.startHM}:00`,
          end_at:   `${dateKey} ${blockForm.endHM}:00`,
          reason: blockForm.reason.trim(),
          block_type: 'maintenance',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal.');
      setShowBlockForm(false);
      onRefresh();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm('Hapus entri ini?')) return;
    setDeleting(blockId);
    try {
      const res = await fetch(buildUrl(`/api/admin/units/blocks/${blockId}`), {
        method: 'DELETE', headers: getHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal hapus.');
      onRefresh();
    } catch (e) { alert(e.message); }
    finally { setDeleting(null); }
  };

  const handleCancelBooking = async (orderId) => {
    if (!window.confirm(`Batalkan booking ${orderId}? Unit akan tersedia kembali.`)) return;
    setDeleting(orderId);
    try {
      const res = await apiFetch(`/api/admin/bookings/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled', payment_status: 'unpaid' }),
      });
      if (!res.success) throw new Error(res.error || 'Gagal.');
      onRefresh();
    } catch (e) { alert(e.message); }
    finally { setDeleting(null); }
  };

  const rentalCount = rentals.length;
  const allEmpty = rentalCount === 0 && blocks.length === 0;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ background: '#0f172a', padding: '16px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Fleet Inventory</p>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 15, margin: '2px 0 0' }}>{unitName}</p>
              <p style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace', margin: '2px 0 0' }}>{plat} · {dayLabel}, {dateStr}</p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          {/* Summary badges */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <span style={{ background: rentalCount === 0 ? 'rgba(255,255,255,0.1)' : rentalCount === 1 ? '#16a34a' : '#d97706', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
              {rentalCount === 0 ? 'Kosong' : `${rentalCount}× Tamu`}
            </span>
            {blocks.length > 0 && (
              <span style={{ background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                {blocks.length}× Servis/Blok
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Empty state */}
            {allEmpty && (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>
                <Bike size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Unit kosong hari ini</p>
              </div>
            )}

            {/* Rental list */}
            {rentals.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Tamu</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rentals.map((r, i) => (
                    <div key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.type === 'booking' ? '#16a34a' : '#d97706', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>{r.name}</span>
                          {r.phone && <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{r.phone}</span>}
                          {r.type === 'booking' && (
                            <span style={{ fontSize: 9, fontWeight: 700, background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 6 }}>APP</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#4b5563', fontFamily: 'monospace', marginTop: 2 }}>
                          {r.startHM} → {r.endHM}
                          {r.notes && <span style={{ color: '#94a3b8', fontFamily: 'inherit', marginLeft: 6 }}>· {r.notes}</span>}
                        </div>
                        {r.orderId && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{r.orderId}</div>}
                      </div>
                      {canManage && (
                        <button
                          onClick={() => r.type === 'booking' ? handleCancelBooking(r.orderId) : handleDeleteBlock(r.blockId)}
                          disabled={!!deleting}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4, opacity: deleting ? 0.5 : 1, flexShrink: 0 }}
                          title={r.type === 'booking' ? 'Batalkan booking' : 'Hapus'}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Block list */}
            {blocks.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Servis / Blokir</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {blocks.map((bl, i) => (
                    <div key={i} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Wrench size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#991b1b' }}>{bl.reason}</div>
                        <div style={{ fontSize: 12, color: '#7f1d1d', fontFamily: 'monospace', marginTop: 2 }}>{bl.startHM} → {bl.endHM}</div>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => handleDeleteBlock(bl.blockId)}
                          disabled={!!deleting}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4, opacity: deleting ? 0.5 : 1, flexShrink: 0 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: 10, margin: 0 }}>{error}</p>}

            {/* Add rental form */}
            {canManage && showAddForm && (
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', margin: 0 }}>Tambah Tamu</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Nama Tamu *</label>
                    <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Budi Santoso"
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>No. HP</label>
                    <input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="0812..."
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Catatan</label>
                    <input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="opsional"
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Jam Ambil</label>
                    <input type="time" value={form.startHM} onChange={e => setForm(f=>({...f,startHM:e.target.value}))}
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Jam Kembali</label>
                    <input type="time" value={form.endHM} onChange={e => setForm(f=>({...f,endHM:e.target.value}))}
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowAddForm(false); setError(''); }}
                    style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#64748b' }}>
                    Batal
                  </button>
                  <button onClick={handleAddManual} disabled={saving}
                    style={{ flex: 2, padding: '9px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Menyimpan...' : 'Simpan Tamu'}
                  </button>
                </div>
              </div>
            )}

            {/* Add block form */}
            {canManage && showBlockForm && (
              <div style={{ background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#991b1b', margin: 0 }}>Blokir / Servis</p>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Alasan *</label>
                  <input value={blockForm.reason} onChange={e => setBlockForm(f=>({...f,reason:e.target.value}))}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #fecaca', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Mulai</label>
                    <input type="time" value={blockForm.startHM} onChange={e => setBlockForm(f=>({...f,startHM:e.target.value}))}
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #fecaca', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Selesai</label>
                    <input type="time" value={blockForm.endHM} onChange={e => setBlockForm(f=>({...f,endHM:e.target.value}))}
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #fecaca', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowBlockForm(false); setError(''); }}
                    style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#64748b' }}>
                    Batal
                  </button>
                  <button onClick={handleAddBlock} disabled={saving}
                    style={{ flex: 2, padding: '9px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Menyimpan...' : 'Blokir Unit'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        {canManage && !showAddForm && !showBlockForm && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => { setShowAddForm(true); setShowBlockForm(false); setError(''); }}
              style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Plus size={14} /> Tambah Tamu
            </button>
            <button onClick={() => { setShowBlockForm(true); setShowAddForm(false); setError(''); }}
              style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Wrench size={13} /> Servis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FleetInventoryTable() {
  const { user } = useContext(AuthContext) || {};
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const canManage = isSuperAdmin;

  const today = new Date();
  const todayKey = fmtDateKey(today);

  const [viewMode, setViewMode]     = useState('week');
  const [currentYear, setCurrentYear]   = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart]   = useState(() => getWeekStart(today.getFullYear(), today.getMonth(), today.getDate()));
  const [cellMap, setCellMap]       = useState({});
  const [units, setUnits]           = useState([]);
  const [filterType, setFilterType] = useState('Semua');
  const [expandedTypes, setExpandedTypes] = useState({});
  const [isLoading, setIsLoading]   = useState(true);
  const [loadError, setLoadError]   = useState('');
  const [modalCell, setModalCell]   = useState(null);
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768);

  const rawBookingsRef = useRef([]);
  const rawBlocksRef   = useRef([]);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ── Build cellMap from raw data ──────────────────────────────────────────────
  const buildCellMap = useCallback((bookings, blocks) => {
    const map = {};

    const addToMap = (key, item) => {
      if (!map[key]) map[key] = { rentals: [], blocks: [], rentalCount: 0, hasBlock: false };
      if (item.itemType === 'rental') { map[key].rentals.push(item); map[key].rentalCount++; }
      else { map[key].blocks.push(item); map[key].hasBlock = true; }
    };

    const skipStatuses = ['cancelled', 'completed', 'selesai'];
    for (const b of bookings) {
      if (!b.unit_id || !b.start_date || !b.end_date) continue;
      if (skipStatuses.includes(String(b.status||'').toLowerCase())) continue;

      const startDt = parseDt(b.start_date);
      const endDt   = parseDt(b.end_date);
      if (!startDt || !endDt) continue;

      const startDayKey = fmtDateKey(startDt);
      const endDayKey   = fmtDateKey(endDt);
      const cur = new Date(startDt); cur.setHours(0,0,0,0);

      while (fmtDateKey(cur) <= endDayKey) {
        const dk = fmtDateKey(cur);
        const isStart = dk === startDayKey;
        const isEnd   = dk === endDayKey;
        const startHM = isStart ? toHM(startDt) : '00:00';
        const endHM   = isEnd   ? toHM(endDt)   : '24:00';
        addToMap(`${b.unit_id}_${dk}`, {
          itemType: 'rental', type: 'booking',
          orderId: b.order_id, name: b.user_name || 'Penyewa',
          phone: b.user_phone || '', notes: '',
          startHM, endHM, status: b.status,
        });
        cur.setDate(cur.getDate() + 1);
      }
    }

    for (const bl of blocks) {
      if (!bl.unit_id || !bl.start_at || !bl.end_at) continue;
      const startDt = parseDt(bl.start_at);
      const endDt   = parseDt(bl.end_at);
      if (!startDt || !endDt) continue;

      const startDayKey = fmtDateKey(startDt);
      const endDayKey   = fmtDateKey(endDt);
      const cur = new Date(startDt); cur.setHours(0,0,0,0);

      while (fmtDateKey(cur) <= endDayKey) {
        const dk = fmtDateKey(cur);
        const isStart = dk === startDayKey;
        const isEnd   = dk === endDayKey;
        const startHM = isStart ? toHM(startDt) : '00:00';
        const endHM   = isEnd   ? toHM(endDt)   : '24:00';

        if (bl.block_type === 'rental_manual') {
          addToMap(`${bl.unit_id}_${dk}`, {
            itemType: 'rental', type: 'manual',
            blockId: bl.id, name: bl.customer_name || 'Manual',
            phone: bl.customer_phone || '', notes: bl.notes || '',
            startHM, endHM,
          });
        } else if (bl.block_type !== 'buffer') {
          addToMap(`${bl.unit_id}_${dk}`, {
            itemType: 'block',
            blockId: bl.id, reason: bl.reason || 'Diblokir',
            block_type: bl.block_type,
            startHM, endHM,
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    setCellMap(map);
  }, []);

  const fetchUnits = useCallback(async () => {
    try {
      const data = await apiFetch('/api/admin/motor-units-all');
      if (data?.success && Array.isArray(data.data)) {
        setUnits(data.data.map(u => ({
          id: u.id, type: u.motor_category || u.motor_name || 'Lainnya',
          name: u.motor_name || 'Motor', plat: u.plate_number,
        })));
        setLoadError('');
        return;
      }
      setUnits([]);
      setLoadError(data?.error || 'Gagal memuat unit.');
    } catch (e) {
      setUnits([]);
      setLoadError(e?.message || 'Gagal memuat unit.');
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [bRes, blRes] = await Promise.all([
        apiFetch('/api/admin/bookings?item_type=motor'),
        apiFetch('/api/admin/units/blocks'),
      ]);
      const bookings = Array.isArray(bRes?.data)  ? bRes.data  : [];
      const blocks   = Array.isArray(blRes?.data) ? blRes.data : [];
      rawBookingsRef.current = bookings;
      rawBlocksRef.current   = blocks;
      buildCellMap(bookings, blocks);
    } catch (e) {
      rawBookingsRef.current = [];
      rawBlocksRef.current = [];
      buildCellMap([], []);
      if (e?.status !== 401) console.warn('fetchAll error:', e?.message);
      setLoadError(e?.message || 'Gagal memuat booking/blokir.');
    }
  }, [buildCellMap]);

  const refreshAll = useCallback(async () => {
    await fetchAll();
    // Also refresh modalCell's cellData if open
    setModalCell(prev => {
      if (!prev) return null;
      return prev; // will re-read from cellMap via effect below
    });
  }, [fetchAll]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        await fetchUnits();
        await fetchAll();
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchUnits, fetchAll]);

  // Re-sync modalCell.cellData after refresh
  useEffect(() => {
    if (!modalCell) return;
    const key = `${modalCell.unitId}_${modalCell.dateKey}`;
    setModalCell(prev => prev ? { ...prev, cellData: cellMap[key] || { rentals: [], blocks: [], rentalCount: 0, hasBlock: false } } : null);
  }, [cellMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ──────────────────────────────────────────────────────────────
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); };
  const prevMonth = () => { if (currentMonth===0) { setCurrentMonth(11); setCurrentYear(y=>y-1); } else setCurrentMonth(m=>m-1); };
  const nextMonth = () => { if (currentMonth===11) { setCurrentMonth(0); setCurrentYear(y=>y+1); } else setCurrentMonth(m=>m+1); };
  const goToToday = () => {
    setWeekStart(getWeekStart(today.getFullYear(), today.getMonth(), today.getDate()));
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // ── Filters ─────────────────────────────────────────────────────────────────
  const types = useMemo(() => [...new Set(units.map(u => u.type))], [units]);
  const filteredUnits = useMemo(() =>
    filterType === 'Semua' ? units : units.filter(u => u.type === filterType),
  [filterType, units]);
  const groupedUnits = useMemo(() => {
    const g = {};
    filteredUnits.forEach(u => { if (!g[u.type]) g[u.type]=[]; g[u.type].push(u); });
    return g;
  }, [filteredUnits]);

  // ── Metrics ─────────────────────────────────────────────────────────────────
  const todayBooked = units.filter(u => {
    const c = cellMap[`${u.id}_${todayKey}`];
    return c && c.rentalCount > 0;
  }).length;
  const todayMaint = units.filter(u => {
    const c = cellMap[`${u.id}_${todayKey}`];
    return c && c.hasBlock;
  }).length;
  const todayFree = units.length - todayBooked;

  const weekOcc = useMemo(() => {
    let booked = 0, total = 0;
    weekDays.forEach(d => {
      units.forEach(u => {
        total++;
        const c = cellMap[`${u.id}_${fmtDateKey(d)}`];
        if (c && c.rentalCount > 0) booked++;
      });
    });
    return total > 0 ? Math.round((booked/total)*100) : 0;
  }, [weekDays, cellMap, units]);

  // ── Cell click ──────────────────────────────────────────────────────────────
  const handleCellClick = (unit, date) => {
    const dk  = fmtDateKey(date);
    const key = `${unit.id}_${dk}`;
    setModalCell({
      unitId: unit.id, unitName: unit.name, plat: unit.plat,
      dateKey: dk,
      dateStr: `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
      dayLabel: DAY_LABELS[date.getDay()],
      cellData: cellMap[key] || { rentals: [], blocks: [], rentalCount: 0, hasBlock: false },
    });
  };

  // ── Cell renderer ────────────────────────────────────────────────────────────
  const renderCell = (unit, date, isToday) => {
    const dk     = fmtDateKey(date);
    const key    = `${unit.id}_${dk}`;
    const cell   = cellMap[key];
    const ckey   = getCellStatus(cell);
    const cst    = CSTATUS[ckey];
    const isEmpty = ckey === 'free';
    const count  = cell?.rentalCount || 0;

    // Striped pattern for mixed (maintenance + rental)
    const bgStyle = ckey === 'mixed'
      ? { background: 'repeating-linear-gradient(45deg, #d97706, #d97706 6px, #dc2626 6px, #dc2626 12px)' }
      : { background: isEmpty ? (isToday ? 'rgba(120,8,28,0.04)' : 'transparent') : cst.bg };

    return (
      <td key={dk} style={{ padding: '3px 4px', verticalAlign: 'middle' }}>
        <div
          onClick={() => handleCellClick(unit, date)}
          title={isEmpty ? 'Kosong – klik untuk tambah' : `${count} tamu${cell?.hasBlock ? ' + servis' : ''}`}
          style={{
            minHeight: isMobile ? 44 : 56, borderRadius: 7,
            padding: isMobile ? '4px 5px' : '5px 7px',
            cursor: 'pointer',
            border: isEmpty ? `1.5px dashed ${isToday ? '#78081C50' : '#e2e8f0'}` : '1.5px solid transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, transition: 'opacity 0.15s, transform 0.1s',
            ...bgStyle,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity='0.8'; e.currentTarget.style.transform='scale(1.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='scale(1)'; }}
        >
          {!isEmpty && (
            <>
              {count > 0 && (
                <span style={{ fontSize: count > 1 ? 16 : 13, fontWeight: 900, color: cst.text, lineHeight: 1 }}>
                  {count > 1 ? `${count}×` : '✓'}
                </span>
              )}
              {cell?.hasBlock && count === 0 && (
                <Wrench size={13} style={{ color: cst.text, opacity: 0.9 }} />
              )}
              {cell?.hasBlock && count > 0 && (
                <Wrench size={9} style={{ color: '#fff', opacity: 0.8 }} />
              )}
            </>
          )}
          {isEmpty && (
            <span style={{ fontSize: 18, opacity: 0.15, color: isToday ? '#78081C' : '#94a3b8' }}>+</span>
          )}
        </div>
      </td>
    );
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  const cardStyle = { background: '#fff', borderRadius: 16, border: '1px solid #e8eaf0', overflow: 'hidden' };
  const headerCellStyle = { fontSize: 10, fontWeight: 700, color: '#64748b', textAlign: 'center', padding: isMobile ? '6px 3px' : '8px 4px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };

  const weekEnd = weekDays[6];
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getDate()}–${weekEnd.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    : `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  // ── Desktop table ────────────────────────────────────────────────────────────
  const DesktopTable = ({ days }) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 160 }} />
          {days.map((_,i) => <col key={i} />)}
        </colgroup>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
            <th style={{ ...headerCellStyle, textAlign: 'left', paddingLeft: 14 }}>Unit / Plat</th>
            {days.map(date => {
              const isToday = fmtDateKey(date) === todayKey;
              return (
                <th key={fmtDateKey(date)} style={{ ...headerCellStyle, color: isToday ? '#78081C' : '#64748b', fontWeight: isToday ? 800 : 700, background: isToday ? '#fff5f5' : 'transparent' }}>
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
                <td colSpan={days.length+1} style={{ padding: '5px 14px', background: '#f1f5f9', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}>
                  {type} <span style={{ color: '#94a3b8', fontWeight: 600 }}>({typeUnits.length})</span>
                </td>
              </tr>
              {typeUnits.map((unit, ri) => (
                <tr key={unit.id} style={{ borderBottom: ri===typeUnits.length-1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9' }}
                  onMouseEnter={e => e.currentTarget.style.background='#fafbfc'}
                  onMouseLeave={e => e.currentTarget.style.background=''}>
                  <td style={{ padding: '4px 8px 4px 14px', borderRight: '1.5px solid #e2e8f0', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{unit.name}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{unit.plat}</div>
                  </td>
                  {days.map(date => renderCell(unit, date, fmtDateKey(date)===todayKey))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Mobile week cards ────────────────────────────────────────────────────────
  const MobileWeekCards = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Object.entries(groupedUnits).map(([type, typeUnits]) => (
        <div key={type}>
          <div onClick={() => setExpandedTypes(e => ({...e,[type]:!e[type]}))}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 10, cursor: 'pointer', marginBottom: expandedTypes[type]===false ? 0 : 6, userSelect: 'none' }}>
            <Bike size={13} style={{ color: '#64748b' }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 }}>{type}</span>
            <ChevronDown size={13} style={{ color: '#94a3b8', transform: expandedTypes[type]===false ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </div>
          {expandedTypes[type]!==false && typeUnits.map(unit => (
            <div key={unit.id} style={{ ...cardStyle, marginBottom: 6 }}>
              <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{unit.name}</span>
                <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{unit.plat}</span>
              </div>
              <div style={{ overflowX: 'auto', padding: '8px 10px', display: 'flex', gap: 5 }}>
                {weekDays.map(date => {
                  const dk = fmtDateKey(date);
                  const isToday = dk === todayKey;
                  const cell = cellMap[`${unit.id}_${dk}`];
                  const ckey = getCellStatus(cell);
                  const cst  = CSTATUS[ckey];
                  const isEmpty = ckey === 'free';
                  const count = cell?.rentalCount || 0;
                  return (
                    <div key={dk} onClick={() => handleCellClick(unit, date)}
                      style={{ minWidth: 48, borderRadius: 8, padding: '5px 3px', cursor: 'pointer', background: isEmpty ? (isToday ? '#fff5f5' : '#f8fafc') : cst.bg, border: `1.5px ${isEmpty ? 'dashed' : 'solid'} ${isEmpty ? (isToday ? '#78081C40' : '#e2e8f0') : 'transparent'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: isToday ? '#78081C' : '#94a3b8', textTransform: 'uppercase' }}>{DAY_LABELS[date.getDay()]}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: isToday ? '#78081C' : (isEmpty ? '#374151' : cst.text) }}>{date.getDate()}</span>
                      {!isEmpty && count > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 900, color: cst.text }}>{count > 1 ? `${count}×` : '✓'}</span>
                      )}
                      {!isEmpty && cell?.hasBlock && count === 0 && <Wrench size={10} style={{ color: cst.text }} />}
                      {isEmpty && <span style={{ fontSize: 14, color: '#d1d5db' }}>+</span>}
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

  // ── Month view ───────────────────────────────────────────────────────────────
  const MonthView = () => {
    const days = Array.from({ length: getDaysInMonth(currentYear, currentMonth) }, (_, i) => new Date(currentYear, currentMonth, i+1));
    if (isMobile) {
      return (
        <div style={{ padding: '0 4px' }}>
          <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>Mode bulan — overview. Tap sel untuk detail.</p>
          {Object.entries(groupedUnits).map(([type, typeUnits]) => (
            <div key={type} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, paddingLeft: 2 }}>{type}</div>
              <div style={{ ...cardStyle, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...headerCellStyle, textAlign: 'left', paddingLeft: 10, width: 90 }}>Plat</th>
                      {days.map(d => (
                        <th key={d.getDate()} style={{ ...headerCellStyle, padding: '6px 2px', fontSize: 9, color: fmtDateKey(d)===todayKey ? '#78081C' : '#94a3b8' }}>{d.getDate()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {typeUnits.map(unit => (
                      <tr key={unit.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '4px 10px', fontSize: 9, fontFamily: 'monospace', color: '#64748b', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' }}>{unit.plat}</td>
                        {days.map(date => {
                          const dk   = fmtDateKey(date);
                          const cell = cellMap[`${unit.id}_${dk}`];
                          const ckey = getCellStatus(cell);
                          const cst  = CSTATUS[ckey];
                          const isToday = dk === todayKey;
                          return (
                            <td key={dk} style={{ padding: '3px 2px', textAlign: 'center' }}>
                              <div onClick={() => handleCellClick(unit, date)} title={cst.label}
                                style={{ width: 14, height: 14, borderRadius: 3, margin: '0 auto', background: ckey==='free' ? (isToday ? '#fee2e2' : '#f1f5f9') : cst.bg, cursor: 'pointer', border: isToday && ckey==='free' ? '1px dashed #78081C60' : 'none' }}
                                onMouseEnter={e => e.currentTarget.style.opacity='0.7'} onMouseLeave={e => e.currentTarget.style.opacity='1'} />
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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", maxWidth: 1200, margin: '0 auto', padding: isMobile ? '16px 12px' : '24px 20px' }}>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 0', color: '#64748b' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Memuat data armada...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!isLoading && loadError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} style={{ color: '#dc2626' }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Gagal memuat data</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#ef4444' }}>{loadError}</p>
          </div>
          <button onClick={() => { setIsLoading(true); fetchUnits().then(()=>setIsLoading(false)); }}
            style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={12} /> Coba Lagi
          </button>
        </div>
      )}

      {!isLoading && !loadError && (
        <>
          {/* View-only banner for non-admin */}
          {!canManage && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15 }}>👁️</span>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>Mode Pantau</span>
                <span style={{ fontSize: 11, color: '#a16207', marginLeft: 8 }}>Kamu dapat melihat jadwal armada, tapi tidak bisa mengubah data.</span>
              </div>
            </div>
          )}

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile?2:4}, 1fr)`, gap: isMobile?8:12, marginBottom: 16 }}>
            {[
              { label: 'Tersewa hari ini', value: todayBooked,   color: '#16a34a' },
              { label: 'Kosong',           value: todayFree,     color: '#64748b' },
              { label: 'Maintenance',      value: todayMaint,    color: '#dc2626' },
              { label: 'Total armada',     value: units.length,  color: '#0f172a' },
            ].map(m => (
              <div key={m.label} style={{ background: '#fff', borderRadius: 12, padding: isMobile?'12px':'14px 18px', border: '1px solid #e8eaf0' }}>
                <div style={{ fontSize: isMobile?20:24, fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 600 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Occupancy */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', border: '1px solid #e8eaf0', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Tingkat hunian minggu ini</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>{weekOcc}%</span>
                <button onClick={refreshAll} title="Refresh"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, display: 'flex' }}>
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${weekOcc}%`, background: '#16a34a', borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, gap: 2 }}>
              {['week','month'].map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s', background: viewMode===v ? '#fff' : 'transparent', color: viewMode===v ? '#1e293b' : '#64748b', boxShadow: viewMode===v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                  {v === 'week' ? 'Mingguan' : 'Bulanan'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={viewMode==='week' ? prevWeek : prevMonth}
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', minWidth: isMobile?140:200, textAlign: 'center' }}>
                {viewMode==='week' ? weekLabel : `${MONTH_NAMES[currentMonth]} ${currentYear}`}
              </span>
              <button onClick={viewMode==='week' ? nextWeek : nextMonth}
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={14} />
              </button>
            </div>

            <button onClick={goToToday}
              style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={13} /> Hari ini
            </button>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginLeft: 'auto' }}>
              {['Semua', ...types].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px solid', borderColor: filterType===t ? '#78081C' : '#e2e8f0', background: filterType===t ? '#78081C' : '#fff', color: filterType===t ? '#fff' : '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            {Object.entries(CSTATUS).filter(([k]) => k !== 'free').map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: k==='mixed' ? 'repeating-linear-gradient(45deg,#d97706,#d97706 3px,#dc2626 3px,#dc2626 6px)' : v.bg }} />
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{v.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, border: '1.5px dashed #e2e8f0' }} />
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Kosong</span>
            </div>
          </div>

          {/* Table */}
          <div style={{ ...cardStyle }}>
            {units.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <Bike size={32} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Belum ada unit motor terdaftar.</p>
              </div>
            ) : viewMode === 'week'
              ? isMobile
                ? <div style={{ padding: '10px 8px' }}><MobileWeekCards /></div>
                : <DesktopTable days={weekDays} />
              : <MonthView />
            }
          </div>

          <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 8, fontWeight: 600 }}>
            Klik sel untuk lihat atau tambah booking · Hijau = 1 tamu · Oranye = 2+ tamu · Merah = maintenance
          </p>
        </>
      )}

      {modalCell && (
        <CellDetailModal
          cell={modalCell}
          onClose={() => setModalCell(null)}
          onRefresh={async () => { await refreshAll(); }}
          canManage={canManage}
        />
      )}
    </div>
  );
}
