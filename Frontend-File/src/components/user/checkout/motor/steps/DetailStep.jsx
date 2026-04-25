import React from 'react';
import {
  AlertTriangle,
  Bike,
  Calendar,
  CheckCircle2,
  CloudRain,
  Info,
  MapPin,
  Tag,
  Users,
} from 'lucide-react';
import { fmtDateTimeId } from '../checkoutMotorUtils';

export default function DetailStep({
  motorName,
  pickupLocation,
  startDate,
  startTime,
  endDate,
  endTime,
  rentalBreakdown,
  tripScope,
  tripDestination,
  gearAddons,
  selectedAddons,
  addonItems,
  motorAddons,
  user,
}) {
  return (
    <>
      {/* Booking Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shrink-0">
            <Bike size={20} className="text-white" />
          </div>
          <div>
            <p className="font-black text-white text-base leading-tight">{motorName}</p>
            <p className="text-slate-400 text-xs font-medium">Armada Sewa</p>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-rose-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Titik Ambil & Kembali</p>
              <p className="font-bold text-slate-800 text-sm">{pickupLocation}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar size={16} className="text-rose-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                Jadwal Booking
              </p>
              <p className="font-bold text-slate-800 text-sm">
                {fmtDateTimeId(startDate, startTime)} <span className="text-slate-400 mx-1 font-normal">→</span> {fmtDateTimeId(endDate, endTime)}
              </p>
              {rentalBreakdown.isValid && (
                <p className="text-xs text-rose-500 font-black mt-1">{rentalBreakdown.packageSummary}</p>
              )}
            </div>
          </div>
        </div>
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {[
            ...(tripScope === 'out_of_town' ? [{ icon: <AlertTriangle size={12} />, label: 'Luar Kota (+Rp 50rb oleh admin)' }] : []),
            ...(tripDestination ? [{ icon: <MapPin size={12} />, label: `Tujuan: ${tripDestination}` }] : []),
            ...(gearAddons?.helmId ? (() => {
              const q = Number(selectedAddons?.[gearAddons.helmId]) || 0;
              return q > 0 ? [{ icon: <Users size={12} />, label: `Helm x${q}` }] : [];
            })() : []),
            ...(gearAddons?.jasHujanId ? (() => {
              const q = Number(selectedAddons?.[gearAddons.jasHujanId]) || 0;
              return q > 0 ? [{ icon: <CloudRain size={12} />, label: `Jas Hujan x${q}` }] : [];
            })() : []),
            ...(gearAddons?.helmAnakId ? (() => {
              const q = Number(selectedAddons?.[gearAddons.helmAnakId]) || 0;
              return q > 0 ? [{ icon: <Users size={12} />, label: `Helm Anak x${q}` }] : [];
            })() : []),
            ...addonItems
              .filter((it) => {
                const hide = new Set([gearAddons?.helmId, gearAddons?.jasHujanId, gearAddons?.helmAnakId].filter(Boolean));
                return !hide.has(Number(it.id));
              })
              .map((it) => {
                const row = motorAddons.find((a) => Number(a.id) === Number(it.id));
                if (!row) return null;
                const qty = Number(it.qty) || 1;
                return { icon: <Tag size={12} />, label: `${row.name}${qty > 1 ? ` x${qty}` : ''}` };
              }).filter(Boolean),
          ].map((item) => (
            <span
              key={item.label}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg"
            >
              {item.icon} {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Data Penyewa */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
          <Users size={16} className="text-slate-500" /> Data Penyewa
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Nama Lengkap', value: user.name },
            { label: 'Email', value: user.email },
            { label: 'No. WhatsApp', value: user.phone || '—' },
            { label: 'Status KYC', value: user.kyc_status || 'unverified', isStatus: true },
          ].map(({ label, value, isStatus }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
              {isStatus ? (
                <span className={`inline-flex items-center gap-1 text-xs font-black uppercase px-2 py-0.5 rounded-lg border ${
                  value === 'verified'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {value === 'verified' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                  {value}
                </span>
              ) : (
                <p className="font-bold text-slate-800 text-sm truncate">{value}</p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
          <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 font-medium">
            Data di atas diambil dari akun kamu. Pastikan nomor WhatsApp aktif untuk menerima konfirmasi dari tim kami.
          </p>
        </div>
      </div>
    </>
  );
}

