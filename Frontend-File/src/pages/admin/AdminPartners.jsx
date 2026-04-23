import React, { useEffect, useMemo, useState } from 'react';
import { useContext } from 'react';
import { Handshake, Plus, Ticket, Search, CheckCircle2, RefreshCcw, Store, UserRound, MapPin, BadgePercent, AlertTriangle, Ban } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { usePartnersAdmin } from '../../hooks/usePartnersAdmin';
import PartnersList from '../../components/admin/partners/PartnersList';
import PartnerModal from '../../components/admin/partners/PartnerModal';
import { apiFetch } from '../../utils/api';

export default function AdminPartners() {
  const { user } = useContext(AuthContext) || {};
  const { partners, isLoading, savePartner, deletePartner, setPartnerActive } = usePartnersAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [validationNote, setValidationNote] = useState('');
  const [voucherFilter, setVoucherFilter] = useState('all');
  const [voucherQuery, setVoucherQuery] = useState('');
  const [vouchers, setVouchers] = useState([]);
  const [isVoucherLoading, setIsVoucherLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const openAdd = () => {
    setEditingData(null);
    setIsModalOpen(true);
  };

  const openEdit = (partner) => {
    setEditingData(partner);
    setIsModalOpen(true);
  };

  const fetchVouchers = async () => {
    setIsVoucherLoading(true);
    try {
      const params = new URLSearchParams();
      if (voucherFilter && voucherFilter !== 'all') params.set('status', voucherFilter);
      if (voucherQuery.trim()) params.set('q', voucherQuery.trim());
      const endpoint = `/api/admin/partners/vouchers${params.toString() ? `?${params.toString()}` : ''}`;
      const result = await apiFetch(endpoint);
      setVouchers(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      alert(err.message || 'Gagal mengambil data voucher partner.');
      setVouchers([]);
    } finally {
      setIsVoucherLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [voucherFilter]);

  const stats = useMemo(() => ({
    claimed: vouchers.filter((item) => item.status === 'claimed').length,
    used: vouchers.filter((item) => item.status === 'used').length,
    expired: vouchers.filter((item) => item.status === 'expired').length,
  }), [vouchers]);

  const canManagePartners = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (!canManagePartners) {
      setVoucherFilter('claimed');
    }
  }, [canManagePartners]);

  const handleValidateVoucher = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim()) {
      alert('Masukkan kode voucher dulu.');
      return;
    }

    try {
      setIsValidating(true);
      setValidationResult(null);
      const result = await apiFetch('/api/admin/partners/vouchers/validate', {
        method: 'POST',
        body: JSON.stringify({
          voucher_code: voucherCode.trim(),
          note: validationNote.trim(),
        }),
      });
      setValidationResult({
        type: 'success',
        title: 'VALID - Voucher Bisa Dipakai',
        message: `${result.data?.voucher_code || voucherCode.trim()} untuk ${result.data?.user_name || 'user'} berhasil divalidasi.`,
        data: result.data || null,
      });
      setVoucherCode('');
      setValidationNote('');
      await fetchVouchers();
    } catch (err) {
      const msg = err.message || 'Gagal memvalidasi voucher.';
      let title = 'VOUCHER TIDAK VALID';
      if (/sudah pernah digunakan/i.test(msg)) title = 'SUDAH DIPAKAI';
      else if (/expired/i.test(msg)) title = 'VOUCHER EXPIRED';
      else if (/tidak ditemukan/i.test(msg)) title = 'KODE TIDAK DITEMUKAN';

      setValidationResult({
        type: 'error',
        title,
        message: msg,
        data: null,
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="animate-fade-in-up pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Handshake className="text-indigo-600" /> {canManagePartners ? 'Partnership' : 'Partner Center'}
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {canManagePartners
              ? 'Kelola promo partner yang tampil di homepage, lalu pantau klaim dan redeem voucher.'
              : 'Lihat promo aktif Anda dan validasi voucher user saat promo ditukar di lokasi.'}
          </p>
        </div>
        {canManagePartners ? (
          <button
            onClick={openAdd}
            className="w-full sm:w-auto bg-slate-900 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
          >
            <Plus size={18} /> Tambah Partner
          </button>
        ) : null}
      </div>

      {canManagePartners ? (
        <PartnersList
          partners={partners}
          isLoading={isLoading}
          onEdit={openEdit}
          onDelete={deletePartner}
          onToggleActive={setPartnerActive}
        />
      ) : (
        <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-slate-900">Promo Aktif di Tempat Anda</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Ini daftar promo yang tampil ke user. Partner cukup fokus ke benefit promo dan validasi voucher saat redeem.
              </p>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 text-xs font-black">
              Promo Aktif {partners.filter((item) => item.is_active).length}
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-[1.75rem] bg-slate-50 border border-slate-100 px-5 py-8 text-center text-sm font-semibold text-slate-500">
              Memuat promo partner...
            </div>
          ) : partners.length === 0 ? (
            <div className="rounded-[1.75rem] bg-slate-50 border border-dashed border-slate-200 px-5 py-8 text-center text-sm font-semibold text-slate-500">
              Belum ada promo partner yang aktif.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {partners.map((partner) => (
                <PartnerPromoCard key={partner.id} partner={partner} />
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.4fr] gap-6 mt-8">
        <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Ticket className="text-indigo-600" size={20} /> Validasi Voucher
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Saat user datang, minta kode voucher lalu tekan validasi. Hasilnya akan langsung muncul besar agar staf mudah membaca.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchVouchers}
              className="w-11 h-11 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50"
              title="Refresh voucher"
            >
              <RefreshCcw size={18} />
            </button>
          </div>

          <form onSubmit={handleValidateVoucher} className="space-y-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                Kode Voucher
              </label>
              <input
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="Contoh: PRT001-123456-ABCDEF"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                Catatan Validasi
              </label>
              <textarea
                rows={3}
                value={validationNote}
                onChange={(e) => setValidationNote(e.target.value)}
                placeholder="Opsional: catatan redeem di lokasi, nama PIC, dll."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isValidating}
              className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-indigo-600 disabled:opacity-60"
            >
              {isValidating ? 'Memvalidasi...' : 'Validasi & Tandai Terpakai'}
            </button>
          </form>

          {validationResult ? (
            <ValidationBanner result={validationResult} />
          ) : null}

          <div className="grid grid-cols-3 gap-3 mt-5">
            <StatCard label="Siap Dipakai" value={stats.claimed} tone="emerald" />
            <StatCard label="Sudah Dipakai" value={stats.used} tone="slate" />
            <StatCard label="Expired" value={stats.expired} tone="amber" />
          </div>
        </section>

        <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-slate-900">Klaim Voucher Terbaru</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Pantau siapa yang sudah klaim promo, status voucher, dan data kontak untuk follow up partner.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={voucherQuery}
                  onChange={(e) => setVoucherQuery(e.target.value)}
                  placeholder="Cari kode / user / partner"
                  className="w-full sm:w-60 rounded-2xl border border-slate-200 pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={voucherFilter}
                onChange={(e) => setVoucherFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Semua Voucher</option>
                <option value="claimed">Siap Dipakai</option>
                <option value="used">Sudah Dipakai</option>
                <option value="expired">Expired</option>
              </select>
              <button
                type="button"
                onClick={fetchVouchers}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-900 hover:bg-slate-50"
              >
                Cari
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {isVoucherLoading ? (
              <div className="rounded-[1.75rem] bg-slate-50 border border-slate-100 px-5 py-8 text-center text-sm font-semibold text-slate-500">
                Memuat data voucher partner...
              </div>
            ) : vouchers.length === 0 ? (
              <div className="rounded-[1.75rem] bg-slate-50 border border-dashed border-slate-200 px-5 py-8 text-center text-sm font-semibold text-slate-500">
                Belum ada voucher yang cocok dengan filter ini.
              </div>
            ) : (
              vouchers.map((voucher) => (
                <VoucherRow key={voucher.id} voucher={voucher} />
              ))
            )}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <PartnerModal
          initialData={editingData}
          onClose={() => setIsModalOpen(false)}
          onSubmit={savePartner}
        />
      )}
    </div>
  );
}

function PartnerPromoCard({ partner }) {
  const isActive = Boolean(partner?.is_active);
  return (
    <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 overflow-hidden">
      <div className="h-36 bg-slate-100 overflow-hidden relative">
        {partner?.image_url ? (
          <img src={partner.image_url} alt={partner.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Store size={28} />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
            {isActive ? 'Aktif di Homepage' : 'Nonaktif'}
          </span>
          {partner?.category ? (
            <span className="px-3 py-1 rounded-full bg-white/90 text-slate-700 text-[10px] font-black uppercase tracking-[0.2em]">
              {partner.category}
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">{partner?.name || 'Partner'}</h3>
            <p className="text-sm text-slate-600 font-medium mt-1 leading-relaxed">
              {partner?.headline || partner?.promo_text || 'Promo partner tersedia.'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
            <BadgePercent size={18} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 mt-4">
          <PromoInfo label="Benefit Promo" value={partner?.promo_text || 'Lihat detail promo di homepage.'} />
          <PromoInfo
            label="Berlaku Sampai"
            value={partner?.valid_until ? new Date(partner.valid_until).toLocaleDateString('id-ID') : 'Selama promo aktif'}
          />
          <PromoInfo
            label="Lokasi"
            value={[partner?.city, partner?.address].filter(Boolean).join(' - ') || 'Lokasi partner'}
            icon={<MapPin size={14} />}
          />
          <PromoInfo
            label="Cara Layanin User"
            value="Minta user tunjukkan kode voucher, lalu input di panel validasi voucher di bawah."
          />
        </div>
      </div>
    </div>
  );
}

function PromoInfo({ label, value, icon = null }) {
  return (
    <div className="rounded-[1.5rem] bg-white border border-slate-100 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-400 mb-1">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-800 leading-relaxed">{value}</p>
    </div>
  );
}

function ValidationBanner({ result }) {
  const isSuccess = result?.type === 'success';
  const toneClass = isSuccess
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : 'border-rose-200 bg-rose-50 text-rose-900';
  const iconWrapClass = isSuccess
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-rose-100 text-rose-700';

  const icon = isSuccess
    ? <CheckCircle2 size={22} />
    : /expired/i.test(result?.title || '')
      ? <AlertTriangle size={22} />
      : <Ban size={22} />;

  return (
    <div className={`mt-5 rounded-[1.75rem] border p-5 ${toneClass}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${iconWrapClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-lg sm:text-xl font-black tracking-tight">{result?.title}</p>
          <p className="text-sm font-medium mt-1 leading-relaxed">{result?.message}</p>
          {result?.data ? (
            <div className="mt-3 rounded-2xl bg-white/70 border border-white/60 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Detail Voucher</p>
              <p className="text-sm font-black mt-1">{result.data.voucher_code}</p>
              <p className="text-sm font-semibold mt-1">
                {result.data.user_name} • {result.data.partner_name}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
  }[tone] || 'bg-slate-100 text-slate-700';

  return (
    <div className={`rounded-[1.5rem] px-4 py-4 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function VoucherRow({ voucher }) {
  const statusClass = voucher.status === 'claimed'
    ? 'bg-emerald-50 text-emerald-700'
    : voucher.status === 'used'
      ? 'bg-slate-100 text-slate-700'
      : 'bg-amber-50 text-amber-700';

  const statusLabel = voucher.status === 'claimed'
    ? 'Siap Dipakai'
    : voucher.status === 'used'
      ? 'Sudah Dipakai'
      : 'Expired';

  return (
    <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 px-5 py-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${statusClass}`}>
              {statusLabel}
            </span>
            <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
              {voucher.voucher_code}
            </span>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Store size={15} className="text-indigo-600" /> {voucher.partner_name}
            </p>
            <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
              <UserRound size={15} className="text-slate-400" /> {voucher.user_name} • {voucher.user_phone || voucher.user_email || '-'}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left lg:text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Diklaim</p>
          <p className="text-sm font-semibold text-slate-800 mt-1">
            {voucher.claimed_at ? new Date(voucher.claimed_at).toLocaleString('id-ID') : '-'}
          </p>
          {voucher.used_at ? (
            <>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mt-3">Dipakai</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                {new Date(voucher.used_at).toLocaleString('id-ID')}
              </p>
            </>
          ) : null}
        </div>
      </div>
      {voucher.validation_note ? (
        <div className="mt-4 rounded-2xl bg-white border border-slate-100 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Catatan</p>
          <p className="text-sm font-medium text-slate-700">{voucher.validation_note}</p>
        </div>
      ) : null}
    </div>
  );
}
