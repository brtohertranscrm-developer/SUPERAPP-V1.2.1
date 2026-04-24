import React from 'react';
import { Bike, ClipboardCheck, Clock, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { fmtDateTime } from './logisticsUtils';

export default function PendingBookingsSection({
  activeTab,
  pendingBookings,
  isLoading,
  error,
  canManage,
  onRefresh,
  onSelectBooking,
}) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sumber Booking</div>
          <div className="mt-1 font-black text-gray-900">
            Booking yang siap dibuat jadwal ({(pendingBookings || []).length})
          </div>
          <div className="text-xs text-gray-500 font-bold mt-1">
            Klik kartu untuk otomatis isi <span className="font-black">Order ID</span> dan waktu. Kamu tinggal pilih PIC.
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-black flex items-center gap-2 hover:bg-gray-50"
          disabled={isLoading}
          title="Refresh booking"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /> Refresh Booking
        </button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400 font-bold">
            <Loader2 className="animate-spin" size={16} /> Memuat booking...
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl font-bold text-sm">{error}</div>
        ) : (pendingBookings || []).length === 0 ? (
          <div className="text-sm text-gray-500 font-medium">
            Tidak ada booking untuk tanggal ini yang butuh dibuat jadwal.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {(pendingBookings || []).map((b) => (
              <button
                key={b.order_id}
                type="button"
                onClick={() => onSelectBooking?.(b)}
                disabled={!canManage}
                className={`text-left rounded-3xl p-4 border transition shadow-sm ${
                  canManage
                    ? 'bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200'
                    : 'bg-gray-50 border-gray-100 opacity-70 cursor-not-allowed'
                }`}
                title={canManage ? 'Klik untuk buat jadwal dari booking' : 'Butuh permission logistics_manage untuk membuat jadwal'}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order</div>
                    <div className="font-black text-gray-900 truncate">{b.order_id}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1 truncate">
                      {b.user_name || 'Pelanggan'}{b.user_phone ? ` • ${b.user_phone}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black tracking-widest">
                      {activeTab === 'delivery' ? 'ANTAR' : 'KEMBALI'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-brand-primary" />
                    <span className="truncate" title={b.suggested_at || ''}>{fmtDateTime(b.suggested_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bike size={14} className="text-brand-primary" />
                    <span className="truncate" title={b.item_name || ''}>{b.item_name || 'Motor'}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <MapPin size={14} className="text-brand-primary" />
                    <span className="truncate" title={b.delivery_address || b.location || ''}>{b.delivery_address || b.location || '—'}</span>
                  </div>
                  {(b.plate_number || b.unit_id) ? (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <ClipboardCheck size={14} className="text-brand-primary" />
                      <span className="truncate">
                        Unit: {b.plate_number || `#${b.unit_id}`}
                      </span>
                    </div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

