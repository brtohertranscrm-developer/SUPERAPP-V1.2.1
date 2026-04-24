import React, { useEffect, useState } from 'react';
import {
  X,
  Truck,
  RotateCcw,
  MapPin,
  Phone,
  Calendar,
  Bike,
  ShieldCheck,
  CloudRain,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Loader2,
  User,
  FileText,
  BadgeDollarSign,
} from 'lucide-react';
import { apiFetch } from '../../../utils/api';

const fmtRp = (v) =>
  Number(v) > 0
    ? 'Rp ' + Number(v).toLocaleString('id-ID')
    : 'Rp 0';

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtDateShort = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Section({ title, icon, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs font-bold text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs font-black text-right ${highlight ? 'text-rose-600' : 'text-slate-900'}`}>{value || '—'}</span>
    </div>
  );
}

export default function TaskDetailSheet({ taskId, onClose, onMarkDone, isMyTask }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    setError('');
    apiFetch(`/api/admin/logistics/tasks/${taskId}`)
      .then((res) => setDetail(res?.data || null))
      .catch((err) => setError(err?.message || 'Gagal memuat detail tugas.'))
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleMarkDone = async () => {
    if (!window.confirm('Tandai tugas ini sebagai selesai?')) return;
    setMarking(true);
    try {
      await apiFetch(`/api/admin/logistics/tasks/${taskId}/complete`, { method: 'PATCH' });
      onMarkDone?.();
      onClose?.();
    } catch (err) {
      alert(err?.message || 'Gagal checklist tugas.');
    } finally {
      setMarking(false);
    }
  };

  const task = detail;
  const booking = detail?.booking;
  const addons = detail?.addons || [];
  const gear = detail?.gear_summary || { helm: 0, jas_hujan: 0, helm_anak: 0 };

  const isDone = String(task?.status || '').toLowerCase() === 'completed';
  const isCancelled = String(task?.status || '').toLowerCase() === 'cancelled';
  const taskType = String(task?.task_type || '').toLowerCase();
  const isDelivery = taskType === 'delivery';

  const paymentStatus = String(booking?.payment_status || '').toLowerCase();
  const isPaid = paymentStatus === 'paid' || Number(booking?.outstanding_amount) === 0;
  const outstanding = Number(booking?.outstanding_amount) || 0;

  const totalHelm = gear.helm + gear.helm_anak;
  const gearItems = [
    { icon: <ShieldCheck size={15} />, label: 'Helm Dewasa', qty: gear.helm, color: 'amber' },
    { icon: <ShieldCheck size={15} />, label: 'Helm Anak', qty: gear.helm_anak, color: 'orange' },
    { icon: <CloudRain size={15} />, label: 'Jas Hujan', qty: gear.jas_hujan, color: 'blue' },
  ].filter((g) => g.qty > 0);

  const otherAddons = addons.filter((a) => {
    const name = String(a?.name_snapshot || '').toLowerCase();
    return !name.includes('helm') && !name.includes('jas hujan');
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`rounded-xl p-2 ${isDelivery ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {isDelivery ? <Truck size={16} /> : <RotateCcw size={16} />}
            </div>
            <div>
              <div className="font-black text-slate-900 text-sm">
                {isDelivery ? 'Detail Pengantaran' : 'Detail Pengembalian'}
              </div>
              {task?.order_id && (
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.order_id}</div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mr-2" size={20} /> Memuat detail...
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-rose-50 text-rose-700 p-4 font-bold text-sm">{error}</div>
          ) : (
            <>
              {/* Payment alert — paling atas jika belum lunas */}
              {!isPaid && outstanding > 0 && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-rose-700 text-sm">Tagih Sisa Bayar</div>
                    <div className="text-xs text-rose-600 font-bold mt-0.5">
                      Kurang bayar: <span className="font-black">{fmtRp(outstanding)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment status lunas */}
              {isPaid && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-sm font-black text-emerald-700">Pembayaran LUNAS</span>
                </div>
              )}

              {/* Customer & Jadwal */}
              <Section title="Customer" icon={<User size={11} />}>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-1">
                  <InfoRow label="Nama" value={task?.customer_name || booking?.user_name} />
                  <InfoRow label="No WA" value={task?.customer_phone || booking?.user_phone} />
                  <InfoRow label="Jadwal" value={fmtDate(task?.scheduled_at)} />
                  {booking && (
                    <>
                      <InfoRow label="Mulai Sewa" value={fmtDateShort(booking.start_date)} />
                      <InfoRow label="Selesai Sewa" value={fmtDateShort(booking.end_date)} />
                    </>
                  )}
                </div>
              </Section>

              {/* Motor */}
              <Section title="Kendaraan" icon={<Bike size={11} />}>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-1">
                  <InfoRow label="Tipe Motor" value={task?.motor_type || booking?.item_name} />
                  {booking?.plate_number && <InfoRow label="Plat" value={booking.plate_number} />}
                  {booking?.unit_id && <InfoRow label="Unit ID" value={String(booking.unit_id)} />}
                </div>
              </Section>

              {/* Lokasi */}
              <Section title="Lokasi Pengantaran" icon={<MapPin size={11} />}>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <p className="text-sm font-bold text-slate-800">
                    {task?.location_text || booking?.delivery_address || booking?.location || '—'}
                  </p>
                  {booking?.delivery_address && task?.location_text && task.location_text !== booking.delivery_address && (
                    <p className="text-xs text-slate-500 font-medium mt-1">{booking.delivery_address}</p>
                  )}
                </div>
              </Section>

              {/* Perlengkapan bawaan */}
              {(gearItems.length > 0 || otherAddons.length > 0) && (
                <Section title="Perlengkapan Yang Dibawa" icon={<Package size={11} />}>
                  <div className="space-y-2">
                    {gearItems.length > 0 && (
                      <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
                        <div className="text-[10px] font-black text-amber-700/70 uppercase tracking-widest mb-2">Helm & Jas Hujan</div>
                        <div className="flex flex-wrap gap-2">
                          {gearItems.map((g) => (
                            <div
                              key={g.label}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${
                                g.color === 'blue' ? 'bg-blue-100 text-blue-700'
                                : g.color === 'orange' ? 'bg-orange-100 text-orange-700'
                                : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {g.icon}
                              {g.label}: <span className="text-base leading-none">{g.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {otherAddons.length > 0 && (
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Add-On Lain</div>
                        <div className="space-y-1.5">
                          {otherAddons.map((a) => (
                            <div key={a.id} className="flex items-center justify-between text-xs font-bold text-slate-700">
                              <span>{a.name_snapshot} ×{a.qty}</span>
                              <span className="text-slate-400">{fmtRp(a.total_price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {gearItems.length === 0 && otherAddons.length === 0 && (
                      <div className="text-xs font-bold text-slate-400">Tidak ada perlengkapan tambahan.</div>
                    )}
                  </div>
                </Section>
              )}

              {/* Pembayaran */}
              {booking && (
                <Section title="Pembayaran" icon={<BadgeDollarSign size={11} />}>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-1">
                    <InfoRow label="Total Tagihan" value={fmtRp(booking.total_price)} />
                    <InfoRow label="Sudah Dibayar" value={fmtRp(booking.paid_amount)} />
                    <InfoRow
                      label="Sisa / Kurang Bayar"
                      value={isPaid ? '✓ Lunas' : fmtRp(outstanding)}
                      highlight={!isPaid && outstanding > 0}
                    />
                  </div>
                </Section>
              )}

              {/* Catatan */}
              {task?.notes && (
                <Section title="Catatan Tugas" icon={<FileText size={11} />}>
                  <div className="rounded-2xl bg-yellow-50 border border-yellow-100 px-4 py-3 text-sm font-medium text-slate-700">
                    {task.notes}
                  </div>
                </Section>
              )}

              {/* Status done */}
              {isDone && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-2 text-sm font-black text-emerald-700">
                  <CheckCircle2 size={16} /> Tugas sudah selesai
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!loading && !error && !isDone && !isCancelled && (
          <div className="px-5 py-4 border-t border-slate-100 flex gap-2 shrink-0 bg-white">
            {(task?.customer_phone || booking?.user_phone) && (
              <a
                href={`https://wa.me/${String(task?.customer_phone || booking?.user_phone || '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-2"
              >
                <Phone size={16} /> Hubungi
              </a>
            )}
            {isMyTask && (
              <button
                onClick={handleMarkDone}
                disabled={marking}
                className="flex-1 rounded-2xl bg-emerald-500 py-3 text-sm font-black text-white hover:bg-emerald-600 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {marking ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                Selesai
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
