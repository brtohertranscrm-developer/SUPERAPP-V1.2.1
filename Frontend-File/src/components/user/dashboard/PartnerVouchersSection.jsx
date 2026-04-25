import React from 'react';
import {
  CheckCircle2,
  Clock3,
  Copy,
  MapPin,
  Phone,
  Ticket,
} from 'lucide-react';

function VoucherInfo({ icon, label, value }) {
  return (
    <div className="rounded-[1.5rem] bg-white border border-slate-100 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500 mb-1">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-800 leading-relaxed">{value}</p>
    </div>
  );
}

export default function PartnerVouchersSection({ vouchers = [], claimedPromos = [] }) {
  const activeVouchers = vouchers.filter((voucher) => voucher.status === 'claimed');
  const recentVouchers = vouchers.slice(0, 4);
  const hasAny = recentVouchers.length > 0 || claimedPromos.length > 0;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket size={18} className="text-indigo-600" /> Promo Saya
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Voucher partner dan kode promo yang sudah kamu klaim.
          </p>
        </div>
        <div className="px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 text-xs font-black">
          Aktif {activeVouchers.length + claimedPromos.length}
        </div>
      </div>

      {claimedPromos.length > 0 && (
        <div className="space-y-3 mb-4">
          {claimedPromos.map((p) => (
            <div
              key={p.id}
              className="rounded-[1.5rem] border border-rose-100 bg-rose-50 px-5 py-4 flex items-center justify-between gap-4"
            >
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full">
                  {p.tag || 'Promo'}
                </span>
                <p className="font-black text-slate-900 mt-1">{p.title}</p>
                {p.discount_percent > 0 && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Diskon {p.discount_percent}%
                    {p.max_discount > 0 ? ` maks Rp${p.max_discount.toLocaleString('id-ID')}` : ''}
                  </p>
                )}
              </div>
              <div className="shrink-0 bg-white border border-rose-200 rounded-xl px-4 py-2 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode</p>
                <p className="font-mono font-black text-slate-900 text-sm">{p.code}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasAny ? (
        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
          <Ticket size={30} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-black text-slate-900">Belum ada promo yang diklaim</p>
          <p className="text-xs text-slate-500 font-medium mt-2">
            Buka homepage, pilih promo, lalu klik klaim agar promo masuk ke dashboard ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentVouchers.map((voucher) => {
            const isActive = voucher.status === 'claimed';
            const badgeClass = isActive
              ? 'bg-emerald-50 text-emerald-700'
              : voucher.status === 'used'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-amber-50 text-amber-700';
            const badgeLabel = isActive
              ? 'Siap Dipakai'
              : voucher.status === 'used'
                ? 'Sudah Dipakai'
                : 'Expired';

            return (
              <div key={voucher.id} className="rounded-[2rem] border border-slate-100 bg-slate-50 px-5 py-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                        {voucher.category || 'Partner'}
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900">{voucher.partner_name}</h4>
                    <p className="text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                      {voucher.headline || voucher.promo_text || 'Promo partner tersedia.'}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-[1.5rem] bg-white border border-slate-200 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Kode Voucher</p>
                    <p className="mt-1 text-sm font-black tracking-wide text-slate-900">{voucher.voucher_code}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 mt-4">
                  <VoucherInfo
                    icon={<Clock3 size={14} />}
                    label="Status"
                    value={isActive ? 'Tunjukkan ke partner saat redeem.' : badgeLabel}
                  />
                  <VoucherInfo
                    icon={<MapPin size={14} />}
                    label="Lokasi"
                    value={[voucher.city, voucher.address].filter(Boolean).join(' - ') || 'Lihat lokasi partner'}
                  />
                  <VoucherInfo
                    icon={<CheckCircle2 size={14} />}
                    label="Berlaku"
                    value={
                      voucher.valid_until
                        ? new Date(voucher.valid_until).toLocaleDateString('id-ID')
                        : 'Selama promo aktif'
                    }
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(voucher.voucher_code || '');
                      alert('Kode voucher berhasil disalin.');
                    }}
                    className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-sm inline-flex items-center justify-center gap-2"
                  >
                    <Copy size={16} /> Salin Kode Voucher
                  </button>
                  {voucher.maps_url ? (
                    <button
                      type="button"
                      onClick={() => window.open(voucher.maps_url, '_blank', 'noreferrer')}
                      className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-sm inline-flex items-center justify-center gap-2"
                    >
                      <MapPin size={16} /> Buka Lokasi
                    </button>
                  ) : null}
                  {voucher.phone_wa ? (
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          `https://wa.me/${String(voucher.phone_wa).replace(/\\D/g, '')}`,
                          '_blank',
                          'noreferrer'
                        )
                      }
                      className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-sm inline-flex items-center justify-center gap-2"
                    >
                      <Phone size={16} /> Hubungi Partner
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

