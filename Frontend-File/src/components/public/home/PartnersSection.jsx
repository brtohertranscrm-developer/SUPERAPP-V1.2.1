import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgePercent, ChevronRight, MapPinned, Store, X, Ticket, Phone, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../../../utils/api';

const PartnersSection = ({ partners = [] }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const navigate = useNavigate();

  const items = Array.isArray(partners) ? partners : [];
  const visibleDesktop = useMemo(() => (expanded ? items : items.slice(0, 4)), [expanded, items]);

  if (items.length === 0) return null;

  const handleClaim = async () => {
    if (!selectedPartner?.id) return;

    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      alert('Silakan login dulu untuk klaim promo partner.');
      navigate('/login');
      return;
    }

    try {
      setIsClaiming(true);
      const response = await fetch(`${API_BASE_URL}/api/partners/${selectedPartner.id}/claim`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Gagal mengklaim promo partner.');
      }

      setClaimResult(result.data);
    } catch (error) {
      alert(error.message || 'Gagal mengklaim promo partner.');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedPartner(null);
    setClaimResult(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-24 relative z-10">
      <div className="bg-white rounded-[3rem] p-6 sm:p-8 border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Store size={18} className="text-indigo-600" /> Partner Brother Trans
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 max-w-xl">
              Promo kecil dari partner pilihan (bengkel, toko, tempat wisata). Bonus—tanpa mengganggu proses booking.
            </p>
          </div>

          {items.length > 4 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] font-black text-indigo-600 hover:text-slate-900 transition-colors inline-flex items-center gap-2"
            >
              {expanded ? 'Tutup' : 'Lihat lainnya'} <ChevronRight size={16} className={expanded ? '-rotate-90 transition-transform' : 'transition-transform'} />
            </button>
          )}
        </div>

        {/* Mobile: horizontal scroll | Desktop: compact grid */}
        <div className="sm:hidden flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
          {items.slice(0, 8).map((p) => (
            <PartnerCard key={p.id} partner={p} compact onOpen={() => setSelectedPartner(p)} />
          ))}
        </div>

        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleDesktop.map((p) => (
            <PartnerCard key={p.id} partner={p} onOpen={() => setSelectedPartner(p)} />
          ))}
        </div>
      </div>

      {selectedPartner ? (
        <PartnerPromoModal
          partner={selectedPartner}
          claimResult={claimResult}
          isClaiming={isClaiming}
          onClaim={handleClaim}
          onClose={handleCloseModal}
          onOpenDashboard={() => {
            handleCloseModal();
            navigate('/dashboard');
          }}
        />
      ) : null}
    </div>
  );
};

const PartnerCard = ({ partner, compact = false, onOpen }) => {
  const name = partner?.name || 'Partner';
  const category = partner?.category || 'Partner';
  const city = partner?.city || '';
  const headline = partner?.headline || partner?.promo_text || '';

  return (
    <div className={`bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden hover:shadow-lg transition-shadow ${compact ? 'min-w-[260px]' : ''}`}>
      <div className={`${compact ? 'h-24' : 'h-28'} bg-slate-100 overflow-hidden relative`}>
        {partner?.image_url ? (
          <img src={partner.image_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Store size={24} />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-white/90 text-slate-800 text-[9px] font-black uppercase tracking-widest border border-white/50">
            {category}
          </span>
          {city ? (
            <span className="px-2.5 py-1 rounded-xl bg-slate-900/80 text-white text-[9px] font-black uppercase tracking-widest border border-white/10">
              {city}
            </span>
          ) : null}
        </div>
      </div>

      <div className={`${compact ? 'p-4' : 'p-5'}`}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-black text-slate-900 text-sm leading-tight line-clamp-2">{name}</h3>
          <div className="shrink-0 w-9 h-9 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
            <BadgePercent size={18} />
          </div>
        </div>
        {headline ? (
          <p className="text-[11px] text-slate-600 font-semibold mt-2 line-clamp-2">{headline}</p>
        ) : (
          <p className="text-[11px] text-slate-400 font-semibold mt-2">Promo partner tersedia.</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpen}
            className="flex-1 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-[11px] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Lihat & Klaim Promo
          </button>
          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
            <MapPinned size={18} />
          </div>
        </div>
      </div>
    </div>
  );
};

const PartnerPromoModal = ({ partner, claimResult, isClaiming, onClaim, onClose, onOpenDashboard }) => {
  const validUntilLabel = partner?.valid_until
    ? new Date(partner.valid_until).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const openExternal = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noreferrer');
  };

  // Lock background scroll while modal open (fix mobile scrolling/tabrakan)
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full overflow-y-auto overscroll-contain px-4 py-6">
        <div className="mx-auto w-full max-w-2xl">
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="relative h-48 sm:h-56 bg-slate-100">
              {partner?.image_url ? (
                <img src={partner.image_url} alt={partner.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Store size={40} />
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 w-11 h-11 rounded-2xl bg-white/90 border border-white/60 flex items-center justify-center text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em]">
              {partner?.category || 'Partner'}
            </span>
            {partner?.city ? (
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-[0.2em]">
                {partner.city}
              </span>
            ) : null}
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">{partner?.name}</h3>
            <p className="mt-2 text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
              {partner?.headline || partner?.promo_text || 'Promo partner tersedia untuk Anda.'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBox label="Benefit Promo" value={partner?.promo_text || 'Lihat detail di lokasi partner.'} />
            <InfoBox label="Berlaku Sampai" value={validUntilLabel || 'Selama promo masih aktif'} />
            <InfoBox label="Alamat" value={partner?.address || 'Lihat maps partner untuk lokasi lengkap.'} />
            <InfoBox label="Cara Pakai" value="Klaim di sini, voucher masuk ke dashboard Anda, lalu tunjukkan saat datang ke partner." />
          </div>

          {partner?.terms ? (
            <div className="rounded-[2rem] border border-amber-100 bg-amber-50 px-5 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700 mb-2">Syarat & Ketentuan</p>
              <p className="text-sm text-amber-950/80 font-medium leading-relaxed">{partner.terms}</p>
            </div>
          ) : null}

          {claimResult ? (
            <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-emerald-900">Promo berhasil diklaim</p>
                  <p className="mt-1 text-sm text-emerald-800 font-medium">
                    Kode voucher Anda: <span className="font-black tracking-wide">{claimResult.voucher_code}</span>
                  </p>
                  <p className="mt-2 text-xs text-emerald-700 font-semibold">
                    Voucher ini sekarang tersimpan di Dashboard User {'>'} Promo Saya.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-black text-sm"
                >
                  Buka Promo Saya
                </button>
                {partner?.maps_url ? (
                  <button
                    type="button"
                    onClick={() => openExternal(partner.maps_url)}
                    className="flex-1 py-3 rounded-2xl bg-white border border-emerald-200 text-emerald-800 font-black text-sm"
                  >
                    Buka Lokasi Partner
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClaim}
                disabled={isClaiming}
                className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white font-black text-sm disabled:opacity-60"
              >
                {isClaiming ? 'Sedang klaim...' : 'Klaim Promo Ini'}
              </button>
              {partner?.maps_url ? (
                <button
                  type="button"
                  onClick={() => openExternal(partner.maps_url)}
                  className="flex-1 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-sm inline-flex items-center justify-center gap-2"
                >
                  <MapPinned size={16} /> Lihat Lokasi
                </button>
              ) : null}
              {partner?.phone_wa ? (
                <button
                  type="button"
                  onClick={() => openExternal(`https://wa.me/${String(partner.phone_wa).replace(/\D/g, '')}`)}
                  className="flex-1 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-sm inline-flex items-center justify-center gap-2"
                >
                  <Phone size={16} /> Hubungi Partner
                </button>
              ) : null}
            </div>
          )}

          <div className="rounded-[2rem] bg-slate-50 border border-slate-100 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
                <Ticket size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Flow penukaran promo</p>
                <p className="mt-1 text-sm text-slate-600 font-medium leading-relaxed">
                  Klaim dulu di website, buka kembali di dashboard user, lalu tunjukkan kode voucher saat datang ke partner. Admin/partner akan memvalidasi kode tersebut saat penukaran.
                </p>
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoBox = ({ label, value }) => (
  <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 px-5 py-4">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{label}</p>
    <p className="text-sm text-slate-800 font-semibold leading-relaxed">{value}</p>
  </div>
);

export default PartnersSection;
