import React from 'react';
import { CloudRain, Loader2, Tag, Users } from 'lucide-react';
import { fmtRp } from '../../checkoutMotorUtils';

export default function AddonsSection({
  isAddonsLoading,
  addonsError,
  motorAddons,
  gearAddons,
  selectedAddons,
  otherAddons,
  setAddonQtyById,
  setAddonQty,
  addonTotal,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
        <Tag size={16} className="text-slate-500" /> Perlengkapan & Add-ons
      </h3>

      {isAddonsLoading ? (
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
          <Loader2 size={16} className="animate-spin" /> Memuat add-on...
        </div>
      ) : addonsError ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-amber-700 text-xs font-bold">{addonsError}</p>
        </div>
      ) : motorAddons.length === 0 ? (
        <p className="text-slate-500 text-sm font-medium">Belum ada add-on yang tersedia.</p>
      ) : (
        <div className="space-y-3">
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Perlengkapan
                </p>
                <p className="font-black text-slate-900 text-sm">
                  Checklist yang dibawa tim pengantaran
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border bg-white text-slate-700 border-slate-200">
                Operasional
              </span>
            </div>

            {!gearAddons?.helmId && !gearAddons?.jasHujanId && !gearAddons?.helmAnakId ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-amber-700 text-xs font-bold">
                  Add-on perlengkapan belum ada. Buat add-on bernama “Helm”, “Jas Hujan”, dan (opsional) “Helm Anak” agar sinkron ke jadwal pengantaran.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: gearAddons?.helmId,
                    label: 'Helm',
                    icon: <Users size={16} className="text-rose-500" />,
                  },
                  {
                    id: gearAddons?.jasHujanId,
                    label: 'Jas Hujan',
                    icon: <CloudRain size={16} className="text-rose-500" />,
                  },
                  {
                    id: gearAddons?.helmAnakId,
                    label: 'Helm Anak',
                    icon: <Users size={16} className="text-rose-500" />,
                  },
                ]
                  .filter((x) => x.id)
                  .map((x) => {
                    const row = motorAddons.find((a) => Number(a.id) === Number(x.id));
                    const qty = Number(selectedAddons?.[x.id]) || 0;
                    const allowQty = Number(row?.allow_quantity) === 1;
                    const maxQty = allowQty ? Math.max(1, Number(row?.max_qty) || 1) : 1;

                    return (
                      <div
                        key={x.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                              {x.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 text-sm truncate">
                                {x.label}
                              </p>
                              <p className="text-[11px] text-slate-500 font-bold truncate">
                                {row?.price ? fmtRp(row.price) : 'Gratis'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {allowQty ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setAddonQtyById(x.id, qty - 1)}
                              disabled={qty <= 0}
                              className="w-9 h-9 rounded-xl border border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            >
                              -
                            </button>
                            <div className="w-10 text-center font-black text-slate-900">{qty}</div>
                            <button
                              type="button"
                              onClick={() => setAddonQtyById(x.id, qty + 1)}
                              disabled={qty >= maxQty}
                              className="w-9 h-9 rounded-xl border border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAddonQtyById(x.id, qty > 0 ? 0 : 1)}
                            className={`shrink-0 px-4 py-2 rounded-xl font-black text-xs transition-colors ${
                              qty > 0
                                ? 'bg-slate-900 text-white hover:bg-rose-500'
                                : 'bg-slate-50 text-slate-900 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {qty > 0 ? 'Hapus' : 'Tambah'}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {otherAddons.map((a) => {
            const qty = Number(selectedAddons?.[a.id]) || 0;
            const allowQty = Number(a.allow_quantity) === 1;
            const maxQty = allowQty ? Math.max(1, Number(a.max_qty) || 1) : 1;
            const isPackage = a.addon_type === 'package';

            return (
              <div
                key={a.id}
                className="border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-900 text-sm truncate">{a.name}</p>
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                        isPackage
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {isPackage ? 'Paket' : 'Add-on'}
                    </span>
                  </div>
                  {a.description && (
                    <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
                      {a.description}
                    </p>
                  )}
                  <p className="text-xs font-black text-slate-700 mt-2">{fmtRp(a.price)}</p>
                  {isPackage && (
                    <p className="text-[11px] text-slate-400 font-bold mt-1">
                      Catatan: maksimal 1 paket per booking.
                    </p>
                  )}
                </div>

                {allowQty ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAddonQty(a, qty - 1)}
                      disabled={qty <= 0}
                      className="w-9 h-9 rounded-xl border border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      -
                    </button>
                    <div className="w-10 text-center font-black text-slate-900">{qty}</div>
                    <button
                      type="button"
                      onClick={() => setAddonQty(a, qty + 1)}
                      disabled={qty >= maxQty}
                      className="w-9 h-9 rounded-xl border border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddonQty(a, qty > 0 ? 0 : 1)}
                    className={`shrink-0 px-4 py-2 rounded-xl font-black text-xs transition-colors ${
                      qty > 0
                        ? 'bg-slate-900 text-white hover:bg-rose-500'
                        : 'bg-slate-50 text-slate-900 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {qty > 0 ? 'Hapus' : 'Tambah'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {addonTotal > 0 && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-emerald-700 text-xs font-black">Total add-on: {fmtRp(addonTotal)}</p>
        </div>
      )}
    </div>
  );
}

