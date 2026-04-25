import React, { useState } from 'react';
import { Bike, Plus, Trash2, Wrench, X } from 'lucide-react';
import { apiFetch } from '../../../../utils/api';
import { toMin } from './fleetInventoryDateUtils';

export default function CellDetailModal({ cell, onClose, onRefresh, canManage }) {
  const { unitId, unitName, plat, dateKey, dateStr, dayLabel, cellData } = cell;
  const rentals = cellData?.rentals || [];
  const blocks = cellData?.blocks || [];

  const [showAddForm, setShowAddForm] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    startHM: '08:00',
    endHM: '18:00',
    notes: '',
  });
  const [blockForm, setBlockForm] = useState({
    reason: 'Servis berkala',
    startHM: '08:00',
    endHM: '17:00',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');

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
    if (!form.name.trim()) {
      setError('Nama tamu wajib diisi.');
      return;
    }
    const startMin = toMin(form.startHM);
    const endMin = toMin(form.endHM);
    if (startMin === null || endMin === null || endMin <= startMin) {
      setError('Jam kembali harus lebih dari jam ambil.');
      return;
    }
    setSaving(true);
    try {
      const startAt = `${dateKey} ${form.startHM}:00`;
      const endAt = `${dateKey} ${form.endHM}:00`;
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
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = async () => {
    setError('');
    if (!blockForm.reason.trim()) {
      setError('Alasan wajib diisi.');
      return;
    }
    const startMin = toMin(blockForm.startHM);
    const endMin = toMin(blockForm.endHM);
    if (startMin === null || endMin === null || endMin <= startMin) {
      setError('Jam selesai harus lebih dari jam mulai.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(buildUrl('/api/admin/units/blocks'), {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: unitId,
          start_at: `${dateKey} ${blockForm.startHM}:00`,
          end_at: `${dateKey} ${blockForm.endHM}:00`,
          reason: blockForm.reason.trim(),
          block_type: 'maintenance',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal.');
      setShowBlockForm(false);
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm('Hapus entri ini?')) return;
    setDeleting(blockId);
    try {
      const res = await fetch(buildUrl(`/api/admin/units/blocks/${blockId}`), {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal hapus.');
      onRefresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
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
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const rentalCount = rentals.length;
  const allEmpty = rentalCount === 0 && blocks.length === 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 440,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ background: '#0f172a', padding: '16px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p
                style={{
                  color: '#94a3b8',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: 0,
                }}
              >
                Fleet Inventory
              </p>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 15, margin: '2px 0 0' }}>{unitName}</p>
              <p
                style={{
                  color: '#64748b',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  margin: '2px 0 0',
                }}
              >
                {plat} · {dayLabel}, {dateStr}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 8,
                padding: 6,
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <span
              style={{
                background:
                  rentalCount === 0 ? 'rgba(255,255,255,0.1)' : rentalCount === 1 ? '#16a34a' : '#d97706',
                color: '#fff',
                fontSize: 11,
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 20,
              }}
            >
              {rentalCount === 0 ? 'Kosong' : `${rentalCount}× Tamu`}
            </span>
            {blocks.length > 0 && (
              <span
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 20,
                }}
              >
                {blocks.length}× Servis/Blok
              </span>
            )}
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allEmpty && (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>
                <Bike size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Unit kosong hari ini</p>
              </div>
            )}

            {rentals.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    margin: '0 0 8px',
                  }}
                >
                  Tamu
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rentals.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 12,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: r.type === 'booking' ? '#16a34a' : '#d97706',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>{r.name}</span>
                          {r.phone && (
                            <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{r.phone}</span>
                          )}
                          {r.type === 'booking' && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                background: '#dcfce7',
                                color: '#16a34a',
                                padding: '1px 6px',
                                borderRadius: 6,
                              }}
                            >
                              APP
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#4b5563', fontFamily: 'monospace', marginTop: 2 }}>
                          {r.startHM} → {r.endHM}
                          {r.notes && (
                            <span style={{ color: '#94a3b8', fontFamily: 'inherit', marginLeft: 6 }}>· {r.notes}</span>
                          )}
                        </div>
                        {r.orderId && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{r.orderId}</div>}
                      </div>
                      {canManage && (
                        <button
                          onClick={() => (r.type === 'booking' ? handleCancelBooking(r.orderId) : handleDeleteBlock(r.blockId))}
                          disabled={!!deleting}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc2626',
                            padding: 4,
                            opacity: deleting ? 0.5 : 1,
                            flexShrink: 0,
                          }}
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

            {blocks.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    margin: '0 0 8px',
                  }}
                >
                  Servis / Blokir
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {blocks.map((bl, i) => (
                    <div
                      key={i}
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 12,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Wrench size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#991b1b' }}>{bl.reason}</div>
                        <div style={{ fontSize: 12, color: '#7f1d1d', fontFamily: 'monospace', marginTop: 2 }}>
                          {bl.startHM} → {bl.endHM}
                        </div>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => handleDeleteBlock(bl.blockId)}
                          disabled={!!deleting}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc2626',
                            padding: 4,
                            opacity: deleting ? 0.5 : 1,
                            flexShrink: 0,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p
                style={{
                  fontSize: 12,
                  color: '#dc2626',
                  background: '#fef2f2',
                  padding: '8px 12px',
                  borderRadius: 10,
                  margin: 0,
                }}
              >
                {error}
              </p>
            )}

            {canManage && showAddForm && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', margin: 0 }}>Tambah Tamu</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#64748b',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Nama Tamu *
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Budi Santoso"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#64748b',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      No. HP
                    </label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="0812..."
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#64748b',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Catatan
                    </label>
                    <input
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="opsional"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#64748b',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Jam Ambil
                    </label>
                    <input
                      type="time"
                      value={form.startHM}
                      onChange={(e) => setForm((f) => ({ ...f, startHM: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#64748b',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Jam Kembali
                    </label>
                    <input
                      type="time"
                      value={form.endHM}
                      onChange={(e) => setForm((f) => ({ ...f, endHM: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setError('');
                    }}
                    style={{
                      flex: 1,
                      padding: '9px',
                      borderRadius: 10,
                      border: '1.5px solid #e2e8f0',
                      background: '#fff',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      color: '#64748b',
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleAddManual}
                    disabled={saving}
                    style={{
                      flex: 2,
                      padding: '9px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#16a34a',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Tamu'}
                  </button>
                </div>
              </div>
            )}

            {canManage && showBlockForm && (
              <div
                style={{
                  background: '#fff1f2',
                  border: '1.5px solid #fecaca',
                  borderRadius: 14,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 800, color: '#991b1b', margin: 0 }}>Blokir / Servis</p>
                <div>
                  <label
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#b91c1c',
                      display: 'block',
                      marginBottom: 4,
                    }}
                  >
                    Alasan *
                  </label>
                  <input
                    value={blockForm.reason}
                    onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))}
                    placeholder="Servis berkala"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1.5px solid #fecaca',
                      borderRadius: 8,
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#b91c1c',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Mulai
                    </label>
                    <input
                      type="time"
                      value={blockForm.startHM}
                      onChange={(e) => setBlockForm((f) => ({ ...f, startHM: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1.5px solid #fecaca',
                        borderRadius: 8,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#b91c1c',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Selesai
                    </label>
                    <input
                      type="time"
                      value={blockForm.endHM}
                      onChange={(e) => setBlockForm((f) => ({ ...f, endHM: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1.5px solid #fecaca',
                        borderRadius: 8,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      setShowBlockForm(false);
                      setError('');
                    }}
                    style={{
                      flex: 1,
                      padding: '9px',
                      borderRadius: 10,
                      border: '1.5px solid #e2e8f0',
                      background: '#fff',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      color: '#64748b',
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleAddBlock}
                    disabled={saving}
                    style={{
                      flex: 2,
                      padding: '9px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#dc2626',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Menyimpan...' : 'Blokir Unit'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {canManage && !showAddForm && !showBlockForm && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => {
                setShowAddForm(true);
                setShowBlockForm(false);
                setError('');
              }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 12,
                border: 'none',
                background: '#16a34a',
                color: '#fff',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Plus size={14} /> Tambah Tamu
            </button>
            <button
              onClick={() => {
                setShowBlockForm(true);
                setShowAddForm(false);
                setError('');
              }}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1.5px solid #fecaca',
                background: '#fff',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Wrench size={13} /> Servis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
