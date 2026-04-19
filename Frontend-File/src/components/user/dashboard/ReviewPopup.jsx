import React, { useState, useRef } from 'react';
import { X, Star, Upload, ExternalLink, CheckCircle2, Loader2, ImageIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const GMAPS_URL = 'https://maps.app.goo.gl/FhGySRUr2qiPcUXX6'; // Ganti dengan link Google Maps Brothers Trans

const ReviewPopup = ({ onClose, onSubmitSuccess, completedOrder }) => {
  const [step, setStep]             = useState('intro');   // 'intro' | 'upload' | 'success'
  const [file, setFile]             = useState(null);
  const [preview, setPreview]       = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError]           = useState('');
  const fileInputRef                = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('Ukuran file maksimal 5MB.'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { handleFileChange({ target: { files: [f] } }); }
  };

  const handleSubmit = async () => {
    if (!file) { setError('Pilih screenshot terlebih dahulu.'); return; }
    setIsUploading(true);
    setError('');
    try {
      const token    = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('screenshot', file);
      if (completedOrder?.id) formData.append('order_id', completedOrder.id);

      const res  = await fetch(`${API_URL}/api/reviews/gmaps`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setStep('success');
        if (onSubmitSuccess) onSubmitSuccess();
      } else {
        setError(data.error || 'Gagal mengirim screenshot.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="relative bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        {/* ── Step: Intro ── */}
        {step === 'intro' && (
          <div className="p-8 text-center">
            {/* Icon bintang */}
            <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-100">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
            </div>

            <h2 className="text-xl font-black text-slate-900 mb-2">
              Terima kasih sudah menyewa!
            </h2>
            <p className="text-sm text-slate-500 font-medium mb-1">
              Pengalaman kamu penting buat kami.
            </p>
            <p className="text-sm text-slate-700 font-bold mb-6">
              Tinggalkan review di Google Maps dan dapatkan
              <span className="text-amber-500"> +50 Miles</span> reward!
            </p>

            {/* Steps */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left space-y-3">
              {[
                { n: 1, text: 'Klik tombol di bawah untuk buka Google Maps' },
                { n: 2, text: 'Tulis review pengalaman sewa kamu' },
                { n: 3, text: 'Screenshot halaman review yang sudah terkirim' },
                { n: 4, text: 'Upload screenshot di sini untuk dapat Miles' },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    {n}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">{text}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <a
                href={GMAPS_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => setStep('upload')}
                className="w-full py-4 bg-slate-900 hover:bg-rose-500 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink size={16} /> Buka Google Maps & Tulis Review
              </a>
              <button
                onClick={() => setStep('upload')}
                className="w-full py-3 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors"
              >
                Sudah review? Langsung upload screenshot →
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Upload ── */}
        {step === 'upload' && (
          <div className="p-8">
            <h2 className="text-lg font-black text-slate-900 mb-1">Upload Screenshot Review</h2>
            <p className="text-xs text-slate-500 font-medium mb-6">
              Screenshot harus terlihat jelas nama akun dan bintang yang diberikan.
            </p>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors mb-4 ${
                preview ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-slate-400 bg-slate-50'
              }`}
            >
              {preview ? (
                <div className="space-y-2">
                  <img src={preview} alt="preview" className="max-h-40 mx-auto rounded-xl object-cover" />
                  <p className="text-xs text-emerald-600 font-bold">{file?.name}</p>
                  <p className="text-[10px] text-slate-400">Klik untuk ganti gambar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mx-auto">
                    <ImageIcon size={22} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Klik atau drag screenshot ke sini</p>
                  <p className="text-xs text-slate-400">JPG, PNG, WebP · Maks 5MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {error && (
              <p className="text-xs text-rose-500 font-bold mb-3 flex items-center gap-1.5">
                <X size={12} /> {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isUploading || !file}
              className="w-full py-4 bg-slate-900 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {isUploading
                ? <><Loader2 size={16} className="animate-spin" /> Mengirim...</>
                : <><Upload size={16} /> Kirim Screenshot</>
              }
            </button>

            <button onClick={() => setStep('intro')} className="w-full mt-2 py-2 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors">
              ← Kembali
            </button>
          </div>
        )}

        {/* ── Step: Success ── */}
        {step === 'success' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-100">
              <CheckCircle2 size={36} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Screenshot Terkirim!</h2>
            <p className="text-sm text-slate-500 font-medium mb-2">
              Tim kami akan memverifikasi dalam <span className="font-bold text-slate-700">1×24 jam</span>.
            </p>
            <p className="text-sm text-slate-700 font-bold mb-8">
              Setelah diverifikasi, <span className="text-amber-500">+50 Miles</span> akan langsung masuk ke akunmu.
            </p>
            <button
              onClick={onClose}
              className="w-full py-4 bg-slate-900 hover:bg-rose-500 text-white font-black rounded-xl text-sm transition-colors"
            >
              Tutup
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReviewPopup;
