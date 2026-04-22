import React, { useState } from 'react';
import { Search, Loader2, MessageCircle, CheckCircle, XCircle, User, Power } from 'lucide-react';

const KycTable = ({ data, isLoading, onUpdateStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatWaNumber = (phone) => {
    if (!phone) return '';
    let formatted = phone.replace(/\D/g, ''); 
    if (formatted.startsWith('0')) {
      formatted = '62' + formatted.substring(1);
    }
    return formatted;
  };

  const filteredData = data.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone.includes(searchTerm)
  );

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
      
      {/* Toolbar Search */}
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" placeholder="Cari nama, email, atau no HP..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
      </div>

      {/* Tabel */}
      {isLoading ? (
        <div className="flex justify-center items-center p-20">
          <Loader2 className="animate-spin text-amber-500" size={40} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-black border-b border-gray-100">
                <th className="p-5">Profil Pelanggan</th><th className="p-5">Kontak</th><th className="p-5 text-center">Status KYC</th><th className="p-5 text-right">Aksi Manual</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredData.length === 0 ? (
                <tr><td colSpan="4" className="text-center p-10 text-gray-400 font-bold">Tidak ada data pelanggan ditemukan.</td></tr>
              ) : (
                filteredData.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors group">
	                    <td className="p-5">
	                      <div className="flex items-center gap-3">
	                        <div className="w-10 h-10 bg-brand-dark text-white rounded-full flex items-center justify-center font-black shadow-sm">{user.name.charAt(0).toUpperCase()}</div>
	                        <div>
	                          <div className="font-bold text-brand-dark text-sm">{user.name}</div>
	                          <div className="text-[10px] text-gray-400 font-bold">{user.email}</div>
	                          {user.ktp_id && (
	                            <div className="text-[10px] text-gray-400 font-black font-mono">KTP: {user.ktp_id}</div>
	                          )}
	                        </div>
	                      </div>
	                    </td>
                    <td className="p-5">
                      <a href={`https://wa.me/${formatWaNumber(user.phone)}?text=Halo%20${encodeURIComponent(user.name)},%20ini%20dari%20Admin%20Brother%20Trans.%20Mohon%20kirimkan%20foto%20KTP%20Anda%20untuk%20proses%20verifikasi%20akun.`}
                         target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#20bd5a] font-bold px-3 py-1.5 rounded-lg transition-colors border border-[#25D366]/20">
                        <MessageCircle size={16} /> WA: {user.phone}
                      </a>
                    </td>
                    <td className="p-5 text-center">
	                      {user.kyc_status === 'verified' ? (
	                        <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 w-fit mx-auto"><CheckCircle size={12}/> Terverifikasi</span>
	                      ) : user.kyc_status === 'rejected' ? (
                        <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 w-fit mx-auto"><XCircle size={12}/> Ditolak</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 w-fit mx-auto"><User size={12}/> Belum Verifikasi</span>
                      )}
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end items-center gap-2">
	                        {user.kyc_status !== 'verified' ? (
	                          <button onClick={() => onUpdateStatus(user.id, 'verified', user.name)} className="px-4 py-2 bg-brand-dark text-white text-xs font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-sm active:scale-95">Verifikasi Manual</button>
	                        ) : (
	                          <button onClick={() => onUpdateStatus(user.id, 'unverified', user.name)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors border border-red-100" title="Cabut Status Verifikasi"><Power size={16} /></button>
	                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default KycTable;
