import React from 'react';
import { Bike, Package, MapPin, AlertTriangle, QrCode, CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';

const ActiveBookingCard = ({
  order,
  activeOrder,
  navigate,
  handleExtend,
  // [FIX] Props baru untuk navigasi multi-booking
  currentOrderIndex = 0,
  totalOrders       = 1,
  goToPrevOrder,
  goToNextOrder,
}) => {
  const data = activeOrder || order;

  // Empty state — tidak ada booking aktif sama sekali
  if (!data && totalOrders === 0) {
    return (
      <div className="w-full bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <Bike size={28} className="text-slate-300" />
        </div>
        <h3 className="text-base font-black text-slate-900 mb-1">Belum Ada Pesanan Aktif</h3>
        <p className="text-xs text-slate-400 font-medium mb-6 max-w-xs">
          Sewa motor atau loker sekarang dan tiket aktif kamu akan muncul di sini.
        </p>
        <button
          onClick={() => navigate('/motor')}
          className="px-6 py-3 bg-slate-900 hover:bg-rose-500 text-white font-black rounded-xl text-sm transition-colors"
        >
          Mulai Sewa
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Icon sesuai tipe item
  const ItemIcon = data.item_type === 'locker' ? Package : Bike;

  return (
    <div className="relative w-full mx-auto mb-10 animate-fade-in-up">

      {/* ── Navigasi & Indikator (tampil hanya jika > 1 booking) ── */}
      {totalOrders > 1 && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Pesanan Aktif
          </span>
          <div className="flex items-center gap-3">
            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalOrders }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentOrderIndex
                      ? 'w-5 h-2 bg-rose-500'
                      : 'w-2 h-2 bg-slate-300'
                  }`}
                />
              ))}
            </div>
            {/* Prev / Next buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevOrder}
                disabled={currentOrderIndex === 0}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} className="text-slate-700" />
              </button>
              <span className="text-[10px] font-black text-slate-400 px-1">
                {currentOrderIndex + 1}/{totalOrders}
              </span>
              <button
                onClick={goToNextOrder}
                disabled={currentOrderIndex === totalOrders - 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} className="text-slate-700" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Kartu Tiket ── */}
      <div
        className="drop-shadow-2xl"
        // Swipe gesture sederhana via touch events
        onTouchStart={(e) => { e.currentTarget._touchX = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - (e.currentTarget._touchX || 0);
          if (dx > 60 && goToPrevOrder) goToPrevOrder();
          if (dx < -60 && goToNextOrder) goToNextOrder();
        }}
      >
        <div className="flex flex-col md:flex-row bg-slate-900 rounded-[2rem] overflow-hidden">

          {/* BAGIAN KIRI: INFO UTAMA */}
          <div className="flex-1 p-6 sm:p-8 relative text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">
                  E-Ticket / Order ID
                </span>
                <span className="font-mono font-black text-2xl sm:text-3xl tracking-wider text-rose-500">
                  {data.id}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] font-black bg-rose-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 uppercase shadow-lg shadow-rose-500/30">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  {data.status}
                </span>
                {/* Badge tipe item */}
                <span className="text-[9px] font-black bg-white/10 text-slate-300 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {data.item_type === 'locker' ? 'Loker' : 'Motor'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-5 mb-8 relative z-10">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shrink-0">
                <ItemIcon size={32} className="text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black leading-tight mb-1">{data.item}</h3>
                <p className="text-slate-300 text-xs sm:text-sm font-medium flex items-center gap-1.5">
                  <MapPin size={14} className="text-rose-500" />
                  {data.location || 'Lokasi belum diset'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-white/5 p-5 rounded-2xl border border-white/10 relative z-10">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Pick-up (Ambil)
                </span>
                <span className="font-bold text-white text-xs sm:text-sm">{data.startDate}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Drop-off (Kembali)
                </span>
                <span className="font-bold text-white text-xs sm:text-sm">{data.endDate}</span>
              </div>
            </div>

            {/* Badge unpaid jika ada */}
            {data.payment_status === 'unpaid' && (
              <div className="mt-4 relative z-10 flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-2.5">
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                <p className="text-amber-300 text-xs font-bold">
                  Ada tagihan yang belum dibayar — segera selesaikan pembayaran.
                </p>
              </div>
            )}
          </div>

          {/* PEMBATAS TIKET */}
          <div className="hidden md:flex flex-col items-center justify-between bg-slate-900 relative w-8">
            <div className="w-8 h-8 bg-slate-50 rounded-full -mt-4 absolute z-10" />
            <div className="h-full border-l-2 border-dashed border-white/20 absolute left-1/2 -translate-x-1/2" />
            <div className="w-8 h-8 bg-slate-50 rounded-full -mb-4 absolute bottom-0 z-10" />
          </div>
          <div className="md:hidden flex items-center justify-between bg-slate-900 relative h-8 w-full">
            <div className="w-8 h-8 bg-slate-50 rounded-full -ml-4 absolute z-10" />
            <div className="w-full border-t-2 border-dashed border-white/20 absolute top-1/2 -translate-y-1/2" />
            <div className="w-8 h-8 bg-slate-50 rounded-full -mr-4 absolute right-0 z-10" />
          </div>

          {/* BAGIAN KANAN: QR + AKSI */}
          <div className="md:w-72 bg-slate-900 p-6 sm:p-8 flex flex-col items-center justify-center relative">

            <div className="bg-white p-4 rounded-3xl shadow-xl mb-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-rose-500 shadow-[0_0_15px_3px_rgba(244,63,94,0.6)] animate-[bounce_2s_infinite] z-10" />
              <QrCode size={120} strokeWidth={1.2} className="text-slate-900 relative z-0" />
            </div>

            <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2 text-center">
              Scan To Ride
            </h4>
            <p className="text-[10px] font-medium text-slate-400 leading-relaxed text-center max-w-[180px]">
              Tunjukkan e-ticket ini ke Admin Lapangan saat pengambilan unit.
            </p>

            <div className="mt-8 pt-4 border-t border-white/10 w-full flex items-center justify-between gap-3">
              <button
                onClick={() => navigate('/support')}
                className="text-[10px] font-black text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors uppercase tracking-widest flex-1 justify-center group"
              >
                <AlertTriangle size={14} className="text-rose-500 group-hover:scale-110 transition-transform" />
                Darurat
              </button>
              <div className="w-px h-6 bg-white/10" />
              <button
                onClick={() => handleExtend && handleExtend(data.id)}
                className="text-[10px] font-black text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors uppercase tracking-widest flex-1 justify-center group"
              >
                <CalendarPlus size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
                Extend
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Hint swipe — tampil hanya mobile & ada lebih dari 1 booking */}
      {totalOrders > 1 && (
        <p className="text-center text-[10px] text-slate-400 font-medium mt-2">
          Geser kiri/kanan untuk lihat pesanan lainnya
        </p>
      )}

    </div>
  );
};

export default ActiveBookingCard;