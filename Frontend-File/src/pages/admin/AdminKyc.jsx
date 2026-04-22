import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useKyc } from '../../hooks/useKyc';
import { useKtpBlacklist } from '../../hooks/useKtpBlacklist';
import CodeGenerator from '../../components/admin/kyc/CodeGenerator';
import KycTable from '../../components/admin/kyc/KycTable';

export default function AdminKyc() {
  const { kycData, isLoading, updateKycStatus } = useKyc();
  const { rows: blacklistRows, isLoading: blacklistLoading, add, remove } = useKtpBlacklist();

  const blacklistedSet = new Set(
    (blacklistRows || [])
      .map((r) => String(r.ktp_id || '').trim())
      .filter(Boolean)
  );

  return (
    <div className="animate-fade-in-up pb-10">
      
      {/* HEADER HALAMAN */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-brand-dark tracking-tight flex items-center gap-2">
          <ShieldCheck className="text-amber-500" /> Verifikasi KYC
        </h1>
        <p className="text-gray-500 text-sm mt-1">Buat kode akses dan hubungi pelanggan via WhatsApp untuk proses verifikasi identitas.</p>
      </div>

      {/* GENERATOR KODE */}
      <CodeGenerator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <KycTable 
            data={kycData} 
            isLoading={isLoading} 
            onUpdateStatus={updateKycStatus}
            blacklistedSet={blacklistedSet}
          />
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden h-fit">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Blacklist KTP</div>
            <div className="font-black text-brand-dark mt-1">Pencegahan Pelanggan Bermasalah</div>
            <div className="text-sm text-gray-500 mt-1">
              Masukkan NIK 16 digit. Dipakai untuk screening registrasi dan verifikasi KYC.
            </div>
          </div>

          <BlacklistForm onAdd={add} />

          <div className="p-5 border-t border-gray-100">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
              Daftar ({blacklistRows?.length || 0})
            </div>
            {blacklistLoading ? (
              <div className="text-sm text-gray-400 font-bold">Memuat...</div>
            ) : blacklistRows?.length ? (
              <div className="space-y-2">
                {blacklistRows.slice(0, 50).map((r) => (
                  <div key={r.id} className="border border-gray-100 rounded-2xl p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono font-black text-sm text-slate-800">{r.ktp_id}</div>
                      {r.reason && <div className="text-xs text-slate-500 font-semibold mt-1">{r.reason}</div>}
                      <div className="text-[10px] text-gray-400 font-bold mt-2">{r.created_at || ''}</div>
                    </div>
                    <button
                      onClick={() => remove(r.ktp_id)}
                      className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 font-black text-xs hover:bg-rose-100"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                {blacklistRows.length > 50 && (
                  <div className="text-xs text-gray-400 font-bold">Menampilkan 50 terbaru.</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-400 font-bold">Belum ada blacklist.</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

function BlacklistForm({ onAdd }) {
  const [ktpId, setKtpId] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await onAdd({ ktp_id: ktpId, reason });
      if (ok) {
        setKtpId('');
        setReason('');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-5 space-y-3">
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">NIK / ID KTP</label>
        <input
          value={ktpId}
          onChange={(e) => setKtpId(e.target.value)}
          placeholder="16 digit angka"
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-mono font-black text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
        />
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Alasan (opsional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Contoh: tidak mengembalikan unit / blacklist komunitas / penipuan..."
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className="w-full px-4 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-black text-sm"
      >
        {isSaving ? 'Menyimpan...' : 'Tambah ke Blacklist'}
      </button>
    </form>
  );
}
