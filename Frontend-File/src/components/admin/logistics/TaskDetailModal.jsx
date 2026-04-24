import React from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  X,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function TaskDetailModal({
  isOpen,
  onClose,
  title,
  selected,
  detailLoading,
  canManage,
  onEdit,
  onDelete,
  onComplete,
  fmtDateTime,
  formatRupiah,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center z-10">
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail Tugas</div>
            <div className="font-black text-xl">
              #{selected?.id || '—'} <span className="text-gray-400">•</span> {title}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500" type="button">
            <X size={24} />
          </button>
        </div>

        {detailLoading ? (
          <div className="flex h-56 flex-col items-center justify-center text-rose-500">
            <Loader2 className="animate-spin mb-3" size={42} />
            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Memuat detail...</div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={selected?.status} />
              <div className="text-[11px] text-gray-400 font-bold">
                Dibuat: {fmtDateTime?.(selected?.created_at)}{' '}
                {selected?.created_by_name ? `oleh ${selected.created_by_name}` : ''}
              </div>
            </div>

            {canManage && (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-2xl font-black hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Pencil size={18} /> Edit Jadwal
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex-1 bg-rose-600 text-white py-3 rounded-2xl font-black hover:bg-rose-700 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> Hapus Jadwal
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jenis Motor</div>
                <div className="font-black text-gray-900">
                  {selected?.booking?.item_name || selected?.motor_type || '—'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</div>
                <div className="font-black text-gray-900">
                  {selected?.booking?.order_id || selected?.order_id || '—'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pelanggan</div>
                <div className="font-black text-gray-900">
                  {selected?.booking?.user_name || selected?.customer_name || '—'}
                </div>
                <div className="mt-2 flex items-center gap-2 text-gray-700 text-sm font-bold">
                  <Phone size={16} className="text-brand-primary" />
                  {selected?.booking?.user_phone || selected?.customer_phone || '—'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jadwal</div>
                <div className="font-black text-gray-900">{fmtDateTime?.(selected?.scheduled_at)}</div>
                <div className="mt-2 flex items-center gap-2 text-gray-700 text-sm font-bold">
                  <MapPin size={16} className="text-brand-primary" />
                  <span
                    className="truncate"
                    title={selected?.booking?.delivery_address || selected?.location_text || ''}
                  >
                    {selected?.booking?.delivery_address || selected?.location_text || '—'}
                  </span>
                </div>
              </div>
            </div>

            {(selected?.gear_summary || selected?.addons?.length) && (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Perlengkapan</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Helm</div>
                    <div className="mt-1 text-xl font-black text-gray-900">{selected?.gear_summary?.helm ?? '—'}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jas Hujan</div>
                    <div className="mt-1 text-xl font-black text-gray-900">
                      {selected?.gear_summary?.jas_hujan ?? '—'}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Helm Anak</div>
                    <div className="mt-1 text-xl font-black text-gray-900">
                      {selected?.gear_summary?.helm_anak ?? '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selected?.booking && (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Tagihan</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</div>
                    <div className="mt-1 text-lg font-black text-gray-900">
                      {formatRupiah?.(selected.booking.total_price)}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DP / Sudah Bayar</div>
                    <div className="mt-1 text-lg font-black text-gray-900">
                      {formatRupiah?.(selected.booking.paid_amount)}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kekurangan</div>
                    <div className="mt-1 text-lg font-black text-rose-600">
                      {formatRupiah?.(selected.booking.outstanding_amount)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PIC Pengantar</div>
              <div className="font-black text-gray-900">{selected?.assigned_to_name || '—'}</div>
            </div>

            {(selected?.notes || selected?.booking?.price_notes) && (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Catatan</div>
                <div className="text-gray-800 font-semibold whitespace-pre-wrap">
                  {selected?.notes || selected?.booking?.price_notes}
                </div>
              </div>
            )}

            {selected?.status === 'completed' && (
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <div className="flex items-center gap-2 font-black text-emerald-800">
                  <CheckCircle2 size={18} /> Sudah selesai
                </div>
                <div className="text-sm text-emerald-700 font-bold mt-2">
                  Waktu: {fmtDateTime?.(selected?.completed_at)}
                  {selected?.completed_by_name ? ` • Oleh: ${selected.completed_by_name}` : ''}
                </div>
              </div>
            )}

            {selected?.status !== 'completed' && selected?.status !== 'cancelled' && (
              <button
                onClick={onComplete}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                type="button"
              >
                <ClipboardCheck size={20} /> Checklist: Tugas Selesai
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

