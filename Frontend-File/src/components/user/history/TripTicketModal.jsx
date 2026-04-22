import React from 'react';
import { createPortal } from 'react-dom';
import { Receipt, X, MapPin, QrCode, Copy, Loader2, Truck, CalendarPlus, MessageCircle, CheckCircle2, Clock, CreditCard } from 'lucide-react';
import { WA_CONTACTS, buildWaLink } from '../../../config/contacts';

const fmtDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const toIcsUtc = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  // YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

const buildMapsLink = (query) => {
  const q = String(query || '').trim();
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

const safeCity = (value) => {
  const v = String(value || '').toLowerCase();
  if (v.includes('solo') || v.includes('balapan')) return 'Solo';
  return 'Yogyakarta';
};

const summarizeGearFromAddons = (addons) => {
  const out = { helm: 0, jas_hujan: 0, helm_anak: 0 };
  for (const a of addons || []) {
    const name = String(a?.name || a?.name_snapshot || '').toLowerCase();
    const qty = Number(a?.qty || 1) || 1;
    if (!name) continue;
    if (name.includes('helm anak')) out.helm_anak += qty;
    else if (name.includes('jas hujan')) out.jas_hujan += qty;
    else if (name.includes('helm')) out.helm += qty;
  }
  return out;
};

const TripTicketModal = ({ ticket, onClose, user, isLoading = false }) => {
  if (!ticket) return null;

  const orderId = ticket.order_id || ticket.id || '—';
  const itemName = ticket.item_name || ticket.item || '—';
  const startRaw = ticket.start_date || ticket.startDate;
  const endRaw = ticket.end_date || ticket.endDate;
  const startText = fmtDateTime(startRaw);
  const endText = fmtDateTime(endRaw);
  const startDateObj = new Date(startRaw);
  const endDateObj = new Date(endRaw);
  const totalPrice = Number(ticket.total_price ?? ticket.totalPrice ?? 0) || 0;
  const paidAmount = Number(ticket.paid_amount ?? ticket.paidAmount ?? 0) || 0;
  const outstanding = Number(ticket.outstanding_amount ?? ticket.outstandingAmount ?? 0) || 0;
  const status = String(ticket.status || '').toLowerCase();
  const paymentStatus = String(ticket.payment_status || '').toLowerCase();
  const plateNumber = ticket.plate_number || ticket.plateNumber || null;
  const deliveryType = ticket.delivery_type || null;
  const deliveryAddress = ticket.delivery_address || null;
  const addons = Array.isArray(ticket.addons) ? ticket.addons : [];
  const gear = summarizeGearFromAddons(addons);

  const city = safeCity(ticket.location);
  const adminContact =
    city === 'Solo' ? WA_CONTACTS.SOLO_ADMIN : WA_CONTACTS.JOGJA_ADMIN;

  const mapsQuery = deliveryAddress || ticket.location || '';
  const mapsLink = buildMapsLink(mapsQuery);

  const waMessageLines = [
    `Halo ${adminContact.label} Brother Trans, saya butuh bantuan untuk booking.`,
    ``,
    `Order ID: ${orderId}`,
    `Nama: ${user?.name || '-'}`,
    `Motor: ${itemName}`,
    `Pickup: ${startText}`,
    `Drop-off: ${endText}`,
    deliveryType && deliveryType !== 'self' ? `Pengantaran: ${deliveryType}` : null,
    deliveryType && deliveryType !== 'self' ? `Alamat: ${deliveryAddress || '-'}` : null,
    plateNumber ? `Plat: ${plateNumber}` : null,
  ].filter(Boolean);
  const waLink = buildWaLink(adminContact.phone_wa, waMessageLines.join('\n'));

  const timeline = (() => {
    // Simple 4 steps: created -> paid -> confirmed -> pickup/active
    const isPaid = paymentStatus === 'paid';
    const isConfirmed = status === 'active' || status === 'completed' || status === 'selesai';
    const isDone = status === 'completed' || status === 'selesai';

    return [
      { key: 'created', label: 'Booking dibuat', icon: CheckCircle2, done: true },
      { key: 'paid', label: isPaid ? 'Pembayaran diterima' : 'Menunggu pembayaran', icon: CreditCard, done: isPaid },
      { key: 'confirmed', label: isConfirmed ? 'Dikonfirmasi admin' : 'Verifikasi admin', icon: Clock, done: isConfirmed },
      { key: 'active', label: isDone ? 'Selesai' : 'Serah terima', icon: QrCode, done: isDone || isConfirmed },
    ];
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(orderId));
    } catch {
      // ignore
    }
  };

  const handleAddToCalendar = () => {
    const dtStart = toIcsUtc(startDateObj);
    const dtEnd = toIcsUtc(endDateObj);
    if (!dtStart || !dtEnd) return;

    const title = `Brother Trans - ${itemName} (${orderId})`;
    const location = deliveryAddress || ticket.location || '';
    const desc = [
      `Order ID: ${orderId}`,
      `Status: ${ticket.status || '-'}`,
      plateNumber ? `Plat: ${plateNumber}` : null,
      location ? `Lokasi: ${location}` : null,
    ].filter(Boolean).join('\\n');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Brother Trans//Booking//ID',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${String(orderId).replace(/[^A-Za-z0-9-]/g, '')}@brother-trans`,
      `DTSTAMP:${toIcsUtc(new Date())}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${title.replace(/\n/g, ' ')}`,
      location ? `LOCATION:${String(location).replace(/\n/g, ' ')}` : null,
      `DESCRIPTION:${String(desc).replace(/\n/g, '\\n')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brother-trans-${String(orderId).replace(/[^A-Za-z0-9-]/g, '')}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
        
        {/* Modal Header */}
        <div className="bg-brand-dark text-white px-6 py-4 flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-2">
            <Receipt size={20} className="text-rose-500"/>
            <h2 className="text-lg font-black tracking-wide">E-Tiket Official</h2>
          </div>
          <button
            onClick={handleCopy}
            className="relative z-10 px-3 py-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2"
            title="Salin Order ID"
          >
            <Copy size={16} /> <span className="text-[11px] font-black hidden sm:inline">Salin</span>
          </button>
          <button onClick={onClose} className="relative z-10 p-2 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        </div>

        {/* Modal Body - Ticket Style */}
        <div className="p-8 border-b-2 border-dashed border-gray-200 relative">
          {/* Lubang Tiket Kiri Kanan */}
          <div className="absolute -left-4 bottom-[-16px] w-8 h-8 bg-slate-900/60 rounded-full"></div>
          <div className="absolute -right-4 bottom-[-16px] w-8 h-8 bg-slate-900/60 rounded-full"></div>
          
          <div className="text-center mb-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Order ID</div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 font-mono font-black text-brand-dark">
              {orderId}
            </div>

            <h3 className="text-2xl font-black text-brand-dark mt-4 mb-1">{itemName}</h3>
            <p className="text-xs font-bold text-gray-500 flex items-center justify-center gap-1.5">
              <MapPin size={12} className="text-brand-primary"/>
              {ticket.location || '—'}
            </p>
            {plateNumber && (
              <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                Plat: <span className="text-brand-dark">{plateNumber}</span>
              </p>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl flex flex-col justify-center items-center border border-gray-200 mb-6 shadow-inner">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 size={28} className="animate-spin text-rose-500 mb-3" />
                <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Memuat detail...</div>
              </div>
            ) : (
              <>
                <QrCode size={160} strokeWidth={1} className="text-brand-dark" />
                <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Tunjukkan kode ini saat serah terima
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            <button
              type="button"
              onClick={() => { if (mapsLink) window.open(mapsLink, '_blank', 'noreferrer'); }}
              disabled={!mapsLink}
              className="bg-white border border-gray-200 rounded-2xl px-3 py-3 font-black text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              title="Buka lokasi di Google Maps"
            >
              <MapPin size={16} className="text-rose-500" /> Maps
            </button>
            <button
              type="button"
              onClick={handleAddToCalendar}
              className="bg-white border border-gray-200 rounded-2xl px-3 py-3 font-black text-[11px] text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
              title="Tambah jadwal ke kalender"
            >
              <CalendarPlus size={16} className="text-blue-500" /> Kalender
            </button>
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="bg-[#25D366] rounded-2xl px-3 py-3 font-black text-[11px] text-white hover:brightness-95 flex items-center justify-center gap-2"
              title="Chat admin via WhatsApp"
            >
              <MessageCircle size={16} /> Admin
            </a>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Progress</div>
            <div className="space-y-2">
              {timeline.map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.key} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-xl border flex items-center justify-center ${t.done ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                      <Icon size={14} className={t.done ? 'text-emerald-600' : 'text-gray-400'} />
                    </div>
                    <div className={`text-xs font-bold ${t.done ? 'text-gray-900' : 'text-gray-500'}`}>{t.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ambil</div>
              <div className="font-bold text-brand-dark text-sm">{startText}</div>
            </div>
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Kembali</div>
              <div className="font-bold text-brand-dark text-sm">{endText}</div>
            </div>
            <div className="col-span-2 mt-2">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Penyewa</div>
              <div className="font-bold text-brand-dark text-sm">{user?.name || '—'}</div>
            </div>
          </div>

          {(gear.helm || gear.jas_hujan || gear.helm_anak) ? (
            <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Perlengkapan</div>
              <div className="flex flex-wrap gap-2">
                {gear.helm ? (
                  <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                    Helm x{gear.helm}
                  </span>
                ) : null}
                {gear.jas_hujan ? (
                  <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                    Jas Hujan x{gear.jas_hujan}
                  </span>
                ) : null}
                {gear.helm_anak ? (
                  <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                    Helm Anak x{gear.helm_anak}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {(deliveryType && deliveryType !== 'self') && (
            <div className="mt-5 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <div className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Truck size={14} /> Pengantaran
              </div>
              <div className="text-xs font-bold text-emerald-900">
                {deliveryType === 'station' ? 'Titik Stasiun' : 'Alamat'}
              </div>
              <div className="text-xs text-emerald-800 font-semibold mt-1">
                {deliveryAddress || '—'}
              </div>
            </div>
          )}

          {addons.length > 0 && (
            <div className="mt-5 bg-white border border-gray-200 rounded-2xl p-4">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Add-ons</div>
              <div className="flex flex-wrap gap-2">
                {addons.slice(0, 8).map((a) => {
                  const name = a?.name || a?.name_snapshot || 'Add-on';
                  const qty = Number(a?.qty || 1) || 1;
                  return (
                    <span key={`${name}-${qty}`} className="text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                      {name}{qty > 1 ? ` x${qty}` : ''}
                    </span>
                  );
                })}
              </div>
              {addons.length > 8 && (
                <div className="text-[11px] text-gray-400 font-bold mt-2">
                  +{addons.length - 8} add-on lainnya
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 p-6 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              {outstanding > 0 ? 'Kekurangan' : 'Total'}
            </div>
            <div className={`text-xl font-black ${outstanding > 0 ? 'text-rose-600' : 'text-brand-primary'}`}>
              Rp {(outstanding > 0 ? outstanding : totalPrice).toLocaleString('id-ID')}
            </div>
            {(paidAmount > 0 || paymentStatus) && (
              <div className="text-[11px] text-gray-500 font-bold mt-1">
                Sudah bayar: Rp {paidAmount.toLocaleString('id-ID')}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</div>
            <div className={`text-xs font-black px-3 py-1 rounded-lg inline-block uppercase tracking-wider ${
              status === 'active' ? 'text-green-700 bg-green-100'
                : status === 'pending' ? 'text-amber-700 bg-amber-100'
                  : 'text-slate-700 bg-slate-200'
            }`}>
              {ticket.status || '—'}{paymentStatus ? ` · ${paymentStatus}` : ''}
            </div>
          </div>
        </div>

        <div className="bg-brand-dark text-center py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest">
          Tunjukkan e-tiket ini ke admin saat serah terima
        </div>
      </div>
    </div>
  );

  // Portal supaya modal tidak "ketahan" stacking context (transform/animation) di parent card.
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modal, document.body);
  }
  return modal;
};

export default TripTicketModal;
