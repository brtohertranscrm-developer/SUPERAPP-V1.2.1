import React from 'react';
import { ShieldAlert, IdCard, Camera, CheckCircle, UploadCloud } from 'lucide-react';

const UploadForm = ({
  nik, setNik,
  ktpFileName, setKtpFileName,
  selfieFileName, setSelfieFileName,
  handleSubmit
}) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header Alert */}
      <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl mb-8 flex items-start gap-4">
        <ShieldAlert className="text-brand-primary shrink-0 mt-1" size={28} />
        <div>
          <h3 className="text-lg font-bold text-brand-dark mb-1">Verifikasi Identitas Diperlukan</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Untuk menjaga keamanan ekosistem Brother Trans dan unit armada, Anda diwajibkan untuk mengunggah kartu identitas resmi (KTP) dan foto diri (Selfie) sebelum dapat melakukan booking layanan.
          </p>
        </div>
      </div>

      {/* Form KYC */}
      <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-xl shadow-rose-900/5 border border-gray-100">
        <h2 className="text-2xl font-bold text-brand-dark mb-8 border-b border-gray-100 pb-4">Lengkapi Data Diri</h2>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Input NIK */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nomor Induk Kependudukan (NIK)</label>
            <input 
              type="number" 
              required
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none font-medium"
              placeholder="Masukkan 16 digit NIK KTP Anda"
            />
          </div>

          {/* Upload Area Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Upload KTP */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <IdCard size={18} className="text-brand-primary" /> Foto KTP
              </label>
              <label className="cursor-pointer group flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-2xl hover:border-brand-primary hover:bg-rose-50/50 transition-all text-center h-48 relative overflow-hidden">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => setKtpFileName(e.target.files[0]?.name)}
                />
                {ktpFileName ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle size={32} className="text-green-500 mb-2" />
                    <span className="text-sm font-medium text-brand-dark truncate max-w-[150px]">{ktpFileName}</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-primary group-hover:text-white transition-colors">
                      <UploadCloud size={24} />
                    </div>
                    <span className="text-sm font-medium text-brand-dark">Klik untuk upload KTP</span>
                    <span className="text-xs text-gray-400 mt-1">Format: JPG, PNG (Max 5MB)</span>
                  </>
                )}
              </label>
            </div>

            {/* Upload Selfie */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Camera size={18} className="text-brand-primary" /> Selfie dengan KTP
              </label>
              <label className="cursor-pointer group flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-2xl hover:border-brand-primary hover:bg-rose-50/50 transition-all text-center h-48 relative overflow-hidden">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => setSelfieFileName(e.target.files[0]?.name)}
                />
                {selfieFileName ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle size={32} className="text-green-500 mb-2" />
                    <span className="text-sm font-medium text-brand-dark truncate max-w-[150px]">{selfieFileName}</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-primary group-hover:text-white transition-colors">
                      <UploadCloud size={24} />
                    </div>
                    <span className="text-sm font-medium text-brand-dark">Klik untuk upload Selfie</span>
                    <span className="text-xs text-gray-400 mt-1">Wajah dan KTP harus terlihat jelas</span>
                  </>
                )}
              </label>
            </div>

          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-secondary transition-colors shadow-md shadow-rose-200 mt-8 text-lg active:scale-95"
          >
            Kirim Dokumen Verifikasi
          </button>
        </form>

      </div>
    </div>
  );
};

export default UploadForm;