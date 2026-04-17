import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Shield, CheckCircle, XCircle, Loader2, Mail, Phone, Key, ChevronDown, ChevronUp } from 'lucide-react';

const UsersTable = ({ users, isLoading, onUpdateKyc, onGenerateCode }) => {
  // State untuk melacak ID pengguna mana yang sedang dibuka (expanded)
  const [expandedUserId, setExpandedUserId] = useState(null);

  // Fungsi untuk toggle (buka/tutup) accordion
  const toggleExpand = (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null); // Tutup jika diklik lagi
    } else {
      setExpandedUserId(userId); // Buka kartu yang diklik
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex justify-center items-center p-20">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 text-center p-16">
        <Shield className="mx-auto text-slate-300 mb-3" size={40}/>
        <p className="text-slate-400 font-bold text-sm">Tidak ada data pengguna yang sesuai.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {users.map((user) => {
        const kyc = user.kyc_status || 'unverified';
        const isExpanded = expandedUserId === user.id;

        return (
          <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all duration-300">
            
            {/* --- HEADER KARTU (TOMBOL ACCORDION) --- */}
            <div 
              onClick={() => toggleExpand(user.id)}
              className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
            >
              {/* Info Singkat Kiri */}
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-sm shrink-0 text-base">
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-black text-slate-900 text-sm leading-tight truncate">{user.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">ID: {user.id.substring(0,8)}</p>
                    
                    {/* Badge Status (Mini) */}
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] border text-[8px] font-bold uppercase tracking-widest
                      ${kyc === 'verified' ? 'bg-green-50 text-green-600 border-green-200' : 
                        kyc === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                        kyc === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      {kyc === 'verified' && <ShieldCheck size={10} />} 
                      {kyc === 'pending' && <ShieldAlert size={10} />} 
                      {kyc === 'rejected' && <XCircle size={10} />} 
                      {kyc === 'unverified' && <Shield size={10} />}
                      {kyc}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Icon Panah Kanan */}
              <div className="shrink-0 text-slate-400">
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            {/* --- BODY & FOOTER KARTU (KONTEN ACCORDION TERSEMBUNYI) --- */}
            {isExpanded && (
              <div className="border-t border-slate-100 bg-white animate-in slide-in-from-top-2 fade-in duration-200">
                
                {/* Info Kontak Detail */}
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-2.5 text-xs font-bold text-slate-600">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400 border border-slate-100">
                        <Mail size={12} />
                      </div>
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400 border border-slate-100">
                        <Phone size={12} />
                      </div>
                      <span>{user.phone || 'Belum diatur'}</span>
                    </div>
                  </div>

                  {/* Tampilan Khusus Kode Verifikasi */}
                  {user.kyc_code && kyc !== 'verified' && (
                    <div className="mt-2 bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Kode KYC</span>
                      <span className="font-mono text-xs font-black text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-50 shadow-sm">
                        {user.kyc_code}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bagian Aksi / Tombol */}
                <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-2">
                  {kyc !== 'verified' && (
                    <button 
                      onClick={() => onGenerateCode(user.id, user.name)} 
                      className="flex-1 basis-full sm:basis-0 justify-center py-2 bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Key size={14}/> {kyc === 'rejected' ? 'Kode Baru' : 'Buat Kode'}
                    </button>
                  )}
                  
                  {kyc !== 'verified' && (
                    <button 
                      onClick={() => onUpdateKyc(user.id, user.name, 'verified')} 
                      className="flex-1 justify-center py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle size={14}/> Acc
                    </button>
                  )}

                  {kyc === 'verified' && (
                    <button 
                      onClick={() => onUpdateKyc(user.id, user.name, 'unverified')} 
                      className="flex-1 justify-center py-2 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <ShieldAlert size={14}/> Cabut
                    </button>
                  )}

                  {kyc !== 'rejected' && (
                    <button 
                      onClick={() => onUpdateKyc(user.id, user.name, 'rejected')} 
                      className="flex-1 justify-center py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <XCircle size={14}/> {kyc === 'verified' ? 'Bekukan' : 'Tolak'}
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>
        );
      })}
    </div>
  );
};

export default UsersTable;